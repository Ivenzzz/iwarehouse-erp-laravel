<?php

namespace App\Features\ProductMasters\Queries;

use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductSpecDefinition;
use App\Support\ProductVariantDefinitions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ListProductMasters
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['master_sku', 'name', 'category'], true)
            ? $request->query('sort')
            : 'master_sku';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $query = ProductMaster::query()
            ->with(['model.brand', 'subcategory.parent', 'specValues.definition'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('master_sku', 'like', "%{$search}%")
                        ->orWhereHas('model', fn ($query) => $query->where('model_name', 'like', "%{$search}%"))
                        ->orWhereHas('model.brand', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('subcategory', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('subcategory.parent', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                });
            });

        if ($sort === 'name') {
            $query
                ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
                ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
                ->select('product_masters.*')
                ->orderBy('product_brands.name', $direction)
                ->orderBy('product_models.model_name', $direction);
        } elseif ($sort === 'category') {
            $query
                ->leftJoin('product_categories as subcategories', 'subcategories.id', '=', 'product_masters.subcategory_id')
                ->leftJoin('product_categories as categories', 'categories.id', '=', 'subcategories.parent_category_id')
                ->select('product_masters.*')
                ->orderBy('categories.name', $direction)
                ->orderBy('subcategories.name', $direction);
        } else {
            $query->orderBy('product_masters.master_sku', $direction);
        }

        $query->withCount('variants');

        $productMasters = $query
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ProductMaster $productMaster) => $this->transformProductMaster($productMaster));

        return [
            'productMasters' => $productMasters,
            'brands' => ProductBrand::query()
                ->with('models')
                ->orderBy('name')
                ->get()
                ->map(fn (ProductBrand $brand) => [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'models' => $brand->models->map(fn ($model) => [
                        'id' => $model->id,
                        'model_name' => $model->model_name,
                    ])->values(),
                ])
                ->values(),
            'categories' => ProductCategory::query()
                ->with('children')
                ->whereNull('parent_category_id')
                ->orderBy('name')
                ->get()
                ->map(fn (ProductCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'children' => $category->children->map(fn (ProductCategory $subcategory) => [
                        'id' => $subcategory->id,
                        'name' => $subcategory->name,
                    ])->values(),
                ])
                ->values(),
            'specDefinitions' => $this->specDefinitions(),
            'variantDefinitions' => $this->variantDefinitions(),
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }

    private function transformProductMaster(ProductMaster $productMaster): array
    {
        $specs = $productMaster->specValues
            ->mapWithKeys(fn ($value) => [$value->definition->key => $value->value])
            ->all();

        return [
            'id' => $productMaster->id,
            'master_sku' => $productMaster->master_sku,
            'product_name' => $productMaster->product_name,
            'model_id' => $productMaster->model_id,
            'subcategory_id' => $productMaster->subcategory_id,
            'image_path' => $productMaster->image_path,
            'image_url' => $productMaster->image_path ? Storage::disk('public')->url($productMaster->image_path) : null,
            'description' => $productMaster->description,
            'brand' => [
                'id' => $productMaster->model->brand->id,
                'name' => $productMaster->model->brand->name,
            ],
            'model' => [
                'id' => $productMaster->model->id,
                'model_name' => $productMaster->model->model_name,
            ],
            'category' => $productMaster->subcategory->parent ? [
                'id' => $productMaster->subcategory->parent->id,
                'name' => $productMaster->subcategory->parent->name,
            ] : null,
            'subcategory' => [
                'id' => $productMaster->subcategory->id,
                'name' => $productMaster->subcategory->name,
            ],
            'variants_count' => $productMaster->variants_count,
            'supports_computer_variants' => ProductVariantDefinitions::supportsComputerVariants(
                $productMaster->subcategory,
            ),
            'specs' => $specs,
            'created_at' => optional($productMaster->created_at)?->toDateTimeString(),
            'updated_at' => optional($productMaster->updated_at)?->toDateTimeString(),
        ];
    }

    private function specDefinitions(): array
    {
        return ProductSpecDefinition::query()
            ->orderBy('sort_order')
            ->get()
            ->groupBy('group')
            ->map(fn ($definitions, $group) => [
                'group' => $group,
                'definitions' => $definitions->map(fn (ProductSpecDefinition $definition) => [
                    'key' => $definition->key,
                    'label' => $definition->label,
                    'sort_order' => $definition->sort_order,
                ])->values(),
            ])
            ->values()
            ->all();
    }

    private function variantDefinitions(): array
    {
        $groups = collect(ProductVariantDefinitions::all())
            ->sortBy('sort_order')
            ->groupBy('group')
            ->map(fn ($definitions, $group) => [
                'group' => $group,
                'definitions' => $definitions->map(fn (array $definition) => [
                    'key' => $definition['key'],
                    'label' => $definition['label'],
                    'data_type' => $definition['data_type'],
                    'sort_order' => $definition['sort_order'],
                    'is_computer_only' => $definition['is_computer_only'],
                    'is_dimension' => $definition['is_dimension'],
                ])->values(),
            ])
            ->values()
            ->all();

        return [
            'groups' => $groups,
            'conditions' => ProductVariantDefinitions::conditions(),
            'generation_keys' => ProductVariantDefinitions::generationKeys(),
            'shared_computer_keys' => ProductVariantDefinitions::sharedComputerKeys(),
        ];
    }
}
