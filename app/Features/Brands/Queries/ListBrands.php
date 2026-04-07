<?php

namespace App\Features\Brands\Queries;

use App\Models\ProductBrand;
use App\Models\ProductModel;
use Illuminate\Http\Request;

class ListBrands
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['name', 'models_count'], true)
            ? $request->query('sort')
            : 'name';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $brands = ProductBrand::query()
            ->with('models')
            ->withCount('models')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhereHas('models', function ($query) use ($search) {
                            $query->where('model_name', 'like', "%{$search}%");
                        });
                });
            })
            ->when(
                $sort === 'models_count',
                fn ($query) => $query->orderBy('models_count', $direction)->orderBy('name'),
                fn ($query) => $query->orderBy('name', $direction),
            )
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ProductBrand $brand) => [
                'id' => $brand->id,
                'name' => $brand->name,
                'models_count' => $brand->models_count,
                'models' => $brand->models->map(fn (ProductModel $model) => [
                    'id' => $model->id,
                    'model_name' => $model->model_name,
                ])->values(),
                'created_at' => optional($brand->created_at)?->toDateTimeString(),
                'updated_at' => optional($brand->updated_at)?->toDateTimeString(),
            ]);

        return [
            'brands' => $brands,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }
}
