<?php

namespace App\Features\ProductMasters\Http\Requests;

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
            'model_code' => ['nullable', 'string', 'max:100'],
            'sku' => ['nullable', 'string', 'max:190'],
            'condition' => ['required', 'string', Rule::in(ProductVariantDefinitions::conditions())],
            'attributes' => ['nullable', 'array'],
            'attributes.*' => ['nullable', 'string', 'max:150'],
        ];
    }

    /**
     * @return array{
     *     model_code: string|null,
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
            'model_code' => $this->nullableTrim($validated['model_code'] ?? null),
            'sku' => $this->nullableTrim($validated['sku'] ?? null),
            'condition' => trim((string) $validated['condition']),
            'attributes' => collect($validated['attributes'] ?? [])
                ->only($allowedKeys)
                ->map(fn ($value) => trim((string) $value))
                ->put('model_code', $this->nullableTrim($validated['model_code'] ?? null) ?? '')
                ->all(),
        ];
    }

    private function nullableTrim(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }
}
