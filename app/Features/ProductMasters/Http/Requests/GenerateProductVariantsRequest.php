<?php

namespace App\Features\ProductMasters\Http\Requests;

use App\Models\ProductMaster;
use App\Support\ProductVariantDefinitions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateProductVariantsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'conditions' => ['required', 'array', 'min:1'],
            'conditions.*' => ['required', 'string', Rule::in(ProductVariantDefinitions::conditions())],
            'colors' => ['nullable', 'array'],
            'colors.*' => ['nullable', 'string', 'max:100'],
            'rams' => ['nullable', 'array'],
            'rams.*' => ['nullable', 'string', 'max:100'],
            'roms' => ['nullable', 'array'],
            'roms.*' => ['nullable', 'string', 'max:100'],
            'shared_attributes' => ['nullable', 'array'],
            'shared_attributes.*' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $productMaster = $this->productMaster();

            if ($productMaster === null) {
                return;
            }

            $allowedKeys = ProductVariantDefinitions::allowedKeysForCategory(
                $productMaster->subcategory,
            );
            $sharedKeys = array_keys($this->input('shared_attributes', []));
            $invalidKeys = array_diff($sharedKeys, $allowedKeys);

            if ($invalidKeys !== []) {
                $validator->errors()->add(
                    'shared_attributes',
                    'One or more shared variant attributes are not allowed for this product category.',
                );
            }
        });
    }

    /**
     * @return array{
     *     conditions: array<int, string>,
     *     colors: array<int, string>,
     *     rams: array<int, string>,
     *     roms: array<int, string>,
     *     shared_attributes: array<string, string>
     * }
     */
    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'conditions' => $this->cleanList($validated['conditions'] ?? []),
            'colors' => $this->cleanList($validated['colors'] ?? []),
            'rams' => $this->cleanList($validated['rams'] ?? []),
            'roms' => $this->cleanList($validated['roms'] ?? []),
            'shared_attributes' => collect($validated['shared_attributes'] ?? [])
                ->only([...ProductVariantDefinitions::sharedComputerKeys(), 'model_code'])
                ->map(fn ($value) => trim((string) $value))
                ->filter(fn ($value) => $value !== '')
                ->all(),
        ];
    }

    private function productMaster(): ?ProductMaster
    {
        $productMaster = $this->route('productMaster');

        return $productMaster instanceof ProductMaster ? $productMaster : null;
    }

    /**
     * @param  array<int, mixed>  $values
     * @return array<int, string>
     */
    private function cleanList(array $values): array
    {
        return collect($values)
            ->map(fn ($value) => trim((string) $value))
            ->filter(fn ($value) => $value !== '')
            ->unique(fn ($value) => mb_strtolower($value))
            ->values()
            ->all();
    }
}
