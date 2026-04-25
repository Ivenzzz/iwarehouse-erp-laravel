<?php

namespace App\Features\ProductMasters\Http\Requests;

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
        $allowedKeys = collect(ProductVariantDefinitions::keys())
            ->reject(fn ($key) => $key === 'condition')
            ->values()
            ->all();

        return [
            'conditions' => $this->cleanList($validated['conditions'] ?? []),
            'colors' => $this->cleanList($validated['colors'] ?? []),
            'rams' => $this->cleanList($validated['rams'] ?? []),
            'roms' => $this->cleanList($validated['roms'] ?? []),
            'shared_attributes' => collect($validated['shared_attributes'] ?? [])
                ->only($allowedKeys)
                ->map(fn ($value) => trim((string) $value))
                ->filter(fn ($value) => $value !== '')
                ->all(),
        ];
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
