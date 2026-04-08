<?php

namespace App\Features\ProductMasters\Http\Requests;

use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Support\GeneratesProductMasterSku;
use App\Support\ProductMasterSpecDefinitions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

class SaveProductMasterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'model_id' => [
                'required',
                'integer',
                'exists:product_models,id',
                Rule::unique('product_masters', 'model_id')->ignore($this->productMaster()?->id),
            ],
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

            if ($subcategory !== null && $subcategory->parent_category_id === null) {
                $validator->errors()->add('subcategory_id', 'Select a subcategory, not a top-level category.');
            }

            $model = ProductModel::with('brand')->find($this->input('model_id'));

            if ($model === null) {
                return;
            }

            $sku = app(GeneratesProductMasterSku::class)->fromModel($model);
            $exists = ProductMaster::query()
                ->where('master_sku', $sku)
                ->when($this->productMaster() !== null, fn ($query) => $query->whereKeyNot($this->productMaster()->id))
                ->exists();

            if ($exists) {
                $validator->errors()->add('model_id', "The generated master SKU {$sku} is already in use.");
            }
        });
    }

    /**
     * @return array{model_id: int, subcategory_id: int, description: string|null, clear_image: bool, specs: array<string, string>}
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
            'model_id' => (int) $validated['model_id'],
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
