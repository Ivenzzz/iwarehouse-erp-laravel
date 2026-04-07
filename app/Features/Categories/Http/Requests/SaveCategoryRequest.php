<?php

namespace App\Features\Categories\Http\Requests;

use App\Models\ProductCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCategoryRequest extends FormRequest
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
                Rule::unique('product_categories', 'name')
                    ->where(function ($query) {
                        $parentId = $this->input('parent_category_id');

                        return $parentId === null
                            ? $query->whereNull('parent_category_id')
                            : $query->where('parent_category_id', $parentId);
                    })
                    ->ignore($this->category()?->id),
            ],
            'parent_category_id' => ['nullable', 'integer', 'exists:product_categories,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $category = $this->category();
            $parentId = $this->input('parent_category_id');

            if ($category !== null && $parentId !== null && (int) $parentId === $category->id) {
                $validator->errors()->add('parent_category_id', 'A category cannot be its own parent.');
            }

            if ($category !== null && $category->children()->exists() && $parentId !== null) {
                $validator->errors()->add('parent_category_id', 'A parent category with subcategories cannot be assigned to another parent.');
            }

            if ($parentId !== null) {
                $parent = ProductCategory::find($parentId);

                if ($parent?->parent_category_id !== null) {
                    $validator->errors()->add('parent_category_id', 'Subcategories cannot be used as parent categories.');
                }
            }
        });
    }

    /**
     * @return array{name: string, parent_category_id: int|null}
     */
    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'name' => trim($validated['name']),
            'parent_category_id' => $validated['parent_category_id'] ?? null,
        ];
    }

    private function category(): ?ProductCategory
    {
        $category = $this->route('productCategory');

        return $category instanceof ProductCategory ? $category : null;
    }
}
