<?php

namespace App\Features\ProductMasters\Http\Requests;

use App\Models\ProductCategory;
use App\Models\ProductBrand;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Support\GeneratesProductMasterSku;
use App\Support\ProductMasterSpecDefinitions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class SaveProductMasterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'brand_id' => ['nullable', 'integer', 'exists:product_brands,id'],
            'model_id' => ['nullable', 'integer', 'exists:product_models,id'],
            'new_brand_name' => ['nullable', 'string', 'max:150'],
            'new_model_name' => ['nullable', 'string', 'max:150'],
            'subcategory_id' => ['required', 'integer', 'exists:product_categories,id'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'clear_image' => ['nullable', 'boolean'],
            'specs' => ['nullable', 'array'],
            'specs.*' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $subcategory = ProductCategory::find($this->input('subcategory_id'));
            $modelId = $this->input('model_id');
            $brandId = $this->input('brand_id');
            $newBrandName = trim((string) $this->input('new_brand_name', ''));
            $newModelName = trim((string) $this->input('new_model_name', ''));

            if ($subcategory !== null && $subcategory->parent_category_id === null) {
                $validator->errors()->add('subcategory_id', 'Select a subcategory, not a top-level category.');
            }

            if ($modelId !== null && $modelId !== '') {
                $model = ProductModel::with('brand')->find($modelId);

                if ($model === null) {
                    return;
                }

                $modelAlreadyAssigned = ProductMaster::query()
                    ->where('model_id', $model->id)
                    ->when($this->productMaster() !== null, fn ($query) => $query->whereKeyNot($this->productMaster()->id))
                    ->exists();

                if ($modelAlreadyAssigned) {
                    $validator->errors()->add('model_id', 'This model is already assigned to another product master.');
                }

                $this->validateGeneratedSkuUniqueness($validator, $model);
                return;
            }

            if ($brandId === null && $newBrandName === '') {
                $validator->errors()->add('brand_id', 'Select an existing brand or add a new brand.');
            }

            if ($newModelName === '') {
                $validator->errors()->add('new_model_name', 'Provide a model name when no existing model is selected.');
                return;
            }

            if ($newBrandName !== '') {
                $brandExists = ProductBrand::query()
                    ->whereRaw('LOWER(name) = ?', [Str::lower($newBrandName)])
                    ->exists();

                if ($brandExists) {
                    $validator->errors()->add('new_brand_name', 'Brand already exists.');
                }
            }

            $resolvedBrand = null;

            if ($brandId !== null && $brandId !== '') {
                $resolvedBrand = ProductBrand::query()->find($brandId);
            }

            if ($resolvedBrand !== null) {
                $modelExists = $resolvedBrand->models()
                    ->whereRaw('LOWER(model_name) = ?', [Str::lower($newModelName)])
                    ->exists();

                if ($modelExists) {
                    $validator->errors()->add('new_model_name', 'Model already exists for this brand.');
                }
            }

            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $skuModel = new ProductModel([
                'model_name' => $newModelName,
            ]);

            $skuBrand = $resolvedBrand ?? new ProductBrand(['name' => $newBrandName]);
            $skuModel->setRelation('brand', $skuBrand);

            $this->validateGeneratedSkuUniqueness($validator, $skuModel);
        });
    }

    private function validateGeneratedSkuUniqueness($validator, ProductModel $model): void
    {
        $sku = app(GeneratesProductMasterSku::class)->fromModel($model);
        $exists = ProductMaster::query()
            ->where('master_sku', $sku)
            ->when($this->productMaster() !== null, fn ($query) => $query->whereKeyNot($this->productMaster()->id))
            ->exists();

        if ($exists) {
            if ($this->input('model_id')) {
                $validator->errors()->add('model_id', "The generated master SKU {$sku} is already in use.");
            } else {
                $validator->errors()->add('new_model_name', "The generated master SKU {$sku} is already in use.");
            }
        }
    }

    /**
     * @return array{
     *     brand_id: int|null,
     *     model_id: int|null,
     *     new_brand_name: string|null,
     *     new_model_name: string|null,
     *     subcategory_id: int,
     *     description: string|null,
     *     clear_image: bool,
     *     specs: array<string, string>
     * }
     */
    public function payload(): array
    {
        $validated = $this->validated();

        $specs = collect($validated['specs'] ?? [])
            ->only(ProductMasterSpecDefinitions::keys())
            ->map(fn ($value) => trim((string) $value))
            ->filter(fn ($value) => $value !== '')
            ->all();

        $description = trim((string) ($validated['description'] ?? ''));

        return [
            'brand_id' => isset($validated['brand_id']) && $validated['brand_id'] !== ''
                ? (int) $validated['brand_id']
                : null,
            'model_id' => isset($validated['model_id']) && $validated['model_id'] !== ''
                ? (int) $validated['model_id']
                : null,
            'new_brand_name' => ($name = trim((string) ($validated['new_brand_name'] ?? ''))) !== '' ? $name : null,
            'new_model_name' => ($name = trim((string) ($validated['new_model_name'] ?? ''))) !== '' ? $name : null,
            'subcategory_id' => (int) $validated['subcategory_id'],
            'description' => $description !== '' ? $description : null,
            'clear_image' => $this->boolean('clear_image'),
            'specs' => $specs,
        ];
    }

    public function imageFile(): ?UploadedFile
    {
        $file = $this->file('image');

        return $file instanceof UploadedFile ? $file : null;
    }

    private function productMaster(): ?ProductMaster
    {
        $productMaster = $this->route('productMaster');

        return $productMaster instanceof ProductMaster ? $productMaster : null;
    }
}
