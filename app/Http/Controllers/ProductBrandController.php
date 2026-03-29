<?php

namespace App\Http\Controllers;

use App\Models\ProductBrand;
use App\Models\ProductModel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductBrandController extends Controller
{
    public function index(): InertiaResponse
    {
        return Inertia::render('Brands', [
            'brands' => ProductBrand::query()
                ->with('models')
                ->orderBy('name')
                ->get()
                ->map(fn (ProductBrand $brand) => [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'models' => $brand->models->map(fn (ProductModel $model) => [
                        'id' => $model->id,
                        'model_name' => $model->model_name,
                    ])->values(),
                    'created_at' => optional($brand->created_at)?->toDateTimeString(),
                    'updated_at' => optional($brand->updated_at)?->toDateTimeString(),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $payload = $this->validateBrandPayload($request);

        DB::transaction(function () use ($payload) {
            $brand = ProductBrand::create([
                'name' => $payload['name'],
            ]);

            $this->syncModels($brand, $payload['models']);
        });

        return redirect()->route('brands.index');
    }

    public function update(Request $request, ProductBrand $productBrand): RedirectResponse
    {
        $payload = $this->validateBrandPayload($request, $productBrand);

        DB::transaction(function () use ($productBrand, $payload) {
            $productBrand->update([
                'name' => $payload['name'],
            ]);

            $this->syncModels($productBrand, $payload['models']);
        });

        return redirect()->route('brands.index');
    }

    public function destroy(ProductBrand $productBrand): RedirectResponse
    {
        $productBrand->delete();

        return redirect()->route('brands.index');
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => 'The CSV file could not be opened.',
            ]);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV file is empty.',
            ]);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->value())
            ->values();

        if (! $normalizedHeaders->contains('brand_name') || ! $normalizedHeaders->contains('model_name')) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV must include brand_name and model_name headers.',
            ]);
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];

        DB::transaction(function () use ($handle, $headerMap, &$rowNumber, &$errors) {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                $brandName = trim((string) ($row[$headerMap['brand_name']] ?? ''));
                $modelName = trim((string) ($row[$headerMap['model_name']] ?? ''));

                if ($brandName === '' && $modelName === '') {
                    continue;
                }

                if ($brandName === '') {
                    $errors["file"] = "Row {$rowNumber}: brand_name is required when model_name is provided.";
                    continue;
                }

                $brand = ProductBrand::firstOrCreate([
                    'name' => $brandName,
                ]);

                if ($modelName === '') {
                    continue;
                }

                ProductModel::firstOrCreate([
                    'brand_id' => $brand->id,
                    'model_name' => $modelName,
                ]);
            }
        });

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return redirect()->route('brands.index');
    }

    public function export(): StreamedResponse
    {
        $brands = ProductBrand::query()
            ->with('models')
            ->orderBy('name')
            ->get();

        $callback = function () use ($brands): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['brand_name', 'model_name']);

            foreach ($brands as $brand) {
                if ($brand->models->isEmpty()) {
                    fputcsv($stream, [$brand->name, '']);
                    continue;
                }

                foreach ($brand->models as $model) {
                    fputcsv($stream, [$brand->name, $model->model_name]);
                }
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'brands-models.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return array{name: string, models: array<int, array{id: int|null, model_name: string}>}
     */
    private function validateBrandPayload(Request $request, ?ProductBrand $brand = null): array
    {
        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('product_brands', 'name')->ignore($brand?->id),
            ],
            'models' => ['nullable', 'array'],
            'models.*.id' => ['nullable', 'integer', 'exists:product_models,id'],
            'models.*.model_name' => ['nullable', 'string', 'max:150'],
        ]);

        $validator->after(function ($validator) use ($request, $brand) {
            $rows = collect($request->input('models', []))
                ->map(fn ($row) => [
                    'id' => $row['id'] ?? null,
                    'model_name' => trim((string) ($row['model_name'] ?? '')),
                ]);

            $nonEmptyRows = $rows->filter(fn ($row) => $row['model_name'] !== '')->values();
            $names = $nonEmptyRows->pluck('model_name')->map(fn ($name) => Str::lower($name));

            if ($names->count() !== $names->unique()->count()) {
                $validator->errors()->add('models', 'Model names must be unique within the brand.');
            }

            foreach ($rows as $index => $row) {
                if (($row['id'] !== null || $row['model_name'] !== '') && $row['model_name'] === '') {
                    $validator->errors()->add("models.{$index}.model_name", 'Model name is required.');
                }

                if ($brand !== null && $row['id'] !== null && ! $brand->models()->whereKey($row['id'])->exists()) {
                    $validator->errors()->add("models.{$index}.id", 'The selected model does not belong to this brand.');
                }
            }
        });

        $validated = $validator->validate();

        $models = collect($validated['models'] ?? [])
            ->map(fn ($row) => [
                'id' => $row['id'] ?? null,
                'model_name' => trim((string) ($row['model_name'] ?? '')),
            ])
            ->filter(fn ($row) => $row['model_name'] !== '')
            ->values()
            ->all();

        return [
            'name' => trim($validated['name']),
            'models' => $models,
        ];
    }

    /**
     * @param  array<int, array{id: int|null, model_name: string}>  $rows
     */
    private function syncModels(ProductBrand $brand, array $rows): void
    {
        $existingIds = collect($rows)
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        $brand->models()
            ->when($existingIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $existingIds))
            ->when($existingIds->isEmpty(), fn ($query) => $query)
            ->delete();

        foreach ($rows as $row) {
            if ($row['id']) {
                $brand->models()->whereKey($row['id'])->update([
                    'model_name' => $row['model_name'],
                ]);

                continue;
            }

            $brand->models()->create([
                'model_name' => $row['model_name'],
            ]);
        }
    }
}
