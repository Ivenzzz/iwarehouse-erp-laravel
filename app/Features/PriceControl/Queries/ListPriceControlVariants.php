<?php

namespace App\Features\PriceControl\Queries;

use App\Features\PriceControl\Support\PriceControlQuery;
use App\Support\ProductVariantNameSql;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ListPriceControlVariants
{
    public function __construct(
        private readonly PriceControlQuery $priceControlQuery,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 15);

        if (mb_strlen($search) < 2) {
            return [
                'variants' => [],
                'filters' => ['search' => $search],
            ];
        }

        $query = self::baseQuery();

        foreach (preg_split('/\s+/', $search) ?: [] as $token) {
            if ($token === '') {
                continue;
            }

            $like = '%'.$token.'%';

            $query->where(function (Builder $builder) use ($like) {
                $builder
                    ->whereRaw(ProductVariantNameSql::expression().' like ?', [$like])
                    ->orWhere('product_variants.sku', 'like', $like)
                    ->orWhere('product_masters.master_sku', 'like', $like)
                    ->orWhere('product_models.model_name', 'like', $like)
                    ->orWhere('product_brands.name', 'like', $like)
                    ->orWhere('product_variants.condition', 'like', $like)
                    ->orWhere('product_variants.ram', 'like', $like)
                    ->orWhere('product_variants.rom', 'like', $like)
                    ->orWhere('product_variants.color', 'like', $like);
            });
        }

        $variants = $query
            ->orderBy('product_brands.name')
            ->orderBy('product_models.model_name')
            ->orderBy('product_variants.ram')
            ->orderBy('product_variants.rom')
            ->orderBy('product_variants.condition')
            ->limit($limit)
            ->get()
            ->map(fn (object $variant) => $this->priceControlQuery->transformVariantRow($variant))
            ->values();

        return [
            'variants' => $variants,
            'filters' => ['search' => $search],
        ];
    }

    public static function baseQuery(): Builder
    {
        return DB::table('product_variants')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->select([
                DB::raw('MIN(product_variants.id) as id'),
                'product_variants.product_master_id',
                DB::raw('MIN('.ProductVariantNameSql::expression().') as variant_name'),
                DB::raw('MIN(product_variants.sku) as sku'),
                'product_variants.condition',
                'product_masters.master_sku',
                DB::raw('product_models.model_name as model_name'),
                DB::raw('product_brands.name as brand_name'),
                DB::raw('product_variants.ram as variant_ram'),
                DB::raw('product_variants.rom as variant_rom'),
                DB::raw('COUNT(DISTINCT product_variants.id) as variants_count'),
            ])
            ->groupBy([
                'product_variants.product_master_id',
                'product_variants.condition',
                'product_masters.master_sku',
                'product_models.model_name',
                'product_brands.name',
                'product_variants.ram',
                'product_variants.rom',
            ]);
    }
}
