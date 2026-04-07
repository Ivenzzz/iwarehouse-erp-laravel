<?php

namespace App\Features\Brands\Http\Requests;

use App\Models\ProductBrand;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveBrandRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('product_brands', 'name')->ignore($this->brand()?->id),
            ],
            'models' => ['nullable', 'array'],
            'models.*.id' => ['nullable', 'integer', 'exists:product_models,id'],
            'models.*.model_name' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $brand = $this->brand();
            $rows = collect($this->input('models', []))
                ->map(fn ($row) => [
                    'id' => is_array($row) ? ($row['id'] ?? null) : null,
                    'model_name' => is_array($row) ? trim((string) ($row['model_name'] ?? '')) : '',
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
    }

    /**
     * @return array{name: string, models: array<int, array{id: int|null, model_name: string}>}
     */
    public function payload(): array
    {
        $validated = $this->validated();

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

    private function brand(): ?ProductBrand
    {
        $brand = $this->route('productBrand');

        return $brand instanceof ProductBrand ? $brand : null;
    }
}
