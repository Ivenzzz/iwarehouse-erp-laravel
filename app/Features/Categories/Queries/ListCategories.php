<?php

namespace App\Features\Categories\Queries;

use App\Models\ProductCategory;
use Illuminate\Http\Request;

class ListCategories
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['name', 'parent'], true)
            ? $request->query('sort')
            : 'name';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $query = ProductCategory::query()
            ->with('parent')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhereHas('parent', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%");
                        });
                });
            });

        if ($sort === 'parent') {
            $query
                ->leftJoin('product_categories as parents', 'parents.id', '=', 'product_categories.parent_category_id')
                ->select('product_categories.*')
                ->orderBy('parents.name', $direction)
                ->orderBy('product_categories.name');
        } else {
            $query->orderBy('product_categories.name', $direction);
        }

        $categories = $query
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ProductCategory $category) => $this->transform($category));

        return [
            'categories' => $categories,
            'topLevelCategories' => ProductCategory::query()
                ->whereNull('parent_category_id')
                ->orderBy('name')
                ->get()
                ->map(fn (ProductCategory $category) => $this->transform($category))
                ->values(),
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }

    private function transform(ProductCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'parent_category_id' => $category->parent_category_id,
            'parent' => $category->parent ? [
                'id' => $category->parent->id,
                'name' => $category->parent->name,
            ] : null,
            'created_at' => optional($category->created_at)?->toDateTimeString(),
            'updated_at' => optional($category->updated_at)?->toDateTimeString(),
        ];
    }
}
