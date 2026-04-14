<?php

namespace App\Features\ProductMasters\Http\Requests;

use App\Models\ProductMaster;
use App\Support\ProductVariantDefinitions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'variant_name' => ['nullable', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:190'],
            'condition' => ['required', 'string', Rule::in(ProductVariantDefinitions::conditions())],
            'attributes' => ['nullable', 'array'],
            'attributes.*' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $productMaster = $this->productMaster();

            if ($productMaster === null) {
                return;
            }

            $allowedKeys = collect(ProductVariantDefinitions::allowedKeysForCategory($productMaster->subcategory))
                ->reject(fn ($key) => $key === 'condition')
                ->values()
                ->all();
            $attributeKeys = array_keys($this->input('attributes', []));
            $invalidKeys = array_diff($attributeKeys, $allowedKeys);

            if ($invalidKeys !== []) {
                $validator->errors()->add(
                    'attributes',
                    'One or more variant attributes are not allowed for this product category.',
                );
            }
        });
    }

    /**
     * @return array{
     *     variant_name: string|null,
     *     sku: string|null,
     *     condition: string,
     *     attributes: array<string, string>
     * }
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $allowedKeys = collect(ProductVariantDefinitions::keys())
            ->reject(fn ($key) => $key === 'condition')
            ->values()
            ->all();

        return [
            'variant_name' => $this->nullableTrim($validated['variant_name'] ?? null),
            'sku' => $this->nullableTrim($validated['sku'] ?? null),
            'condition' => trim((string) $validated['condition']),
            'attributes' => collect($validated['attributes'] ?? [])
                ->only($allowedKeys)
                ->map(fn ($value) => trim((string) $value))
                ->all(),
        ];
    }

    private function productMaster(): ?ProductMaster
    {
        $productMaster = $this->route('productMaster');

        return $productMaster instanceof ProductMaster ? $productMaster : null;
    }

    private function nullableTrim(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }
}
