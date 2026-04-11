<?php

namespace App\Features\PriceControl\Queries;

use App\Features\PriceControl\Support\PriceControlQuery;
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
                    ->where('product_variants.variant_name', 'like', $like)
                    ->orWhere('product_variants.sku', 'like', $like)
                    ->orWhere('product_masters.master_sku', 'like', $like)
                    ->orWhere('product_models.model_name', 'like', $like)
                    ->orWhere('product_brands.name', 'like', $like)
                    ->orWhere('product_variants.condition', 'like', $like)
                    ->orWhere('variant_ram_values.value', 'like', $like)
                    ->orWhere('variant_rom_values.value', 'like', $like);
            });
        }

        $variants = $query
            ->orderBy('product_brands.name')
            ->orderBy('product_models.model_name')
            ->orderBy('variant_ram_values.value')
            ->orderBy('variant_rom_values.value')
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
        $ramAttributeIds = self::attributeIds(['ram']);
        $romAttributeIds = self::attributeIds(['storage', 'rom']);

        return DB::table('product_variants')
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->leftJoin('product_variant_values as variant_ram_values', function ($join) use ($ramAttributeIds) {
                $join
                    ->on('variant_ram_values.product_variant_id', '=', 'product_variants.id')
                    ->whereIn('variant_ram_values.product_variant_attribute_id', $ramAttributeIds);
            })
            ->leftJoin('product_variant_values as variant_rom_values', function ($join) use ($romAttributeIds) {
                $join
                    ->on('variant_rom_values.product_variant_id', '=', 'product_variants.id')
                    ->whereIn('variant_rom_values.product_variant_attribute_id', $romAttributeIds);
            })
            ->select([
                DB::raw('MIN(product_variants.id) as id'),
                'product_variants.product_master_id',
                DB::raw('MIN(product_variants.variant_name) as variant_name'),
                DB::raw('MIN(product_variants.sku) as sku'),
                'product_variants.condition',
                'product_masters.master_sku',
                DB::raw('product_models.model_name as model_name'),
                DB::raw('product_brands.name as brand_name'),
                DB::raw('variant_ram_values.value as variant_ram'),
                DB::raw('variant_rom_values.value as variant_rom'),
                DB::raw('COUNT(DISTINCT product_variants.id) as variants_count'),
            ])
            ->groupBy([
                'product_variants.product_master_id',
                'product_variants.condition',
                'product_masters.master_sku',
                'product_models.model_name',
                'product_brands.name',
                'variant_ram_values.value',
                'variant_rom_values.value',
            ]);
    }

    private static function attributeIds(array $keys): array
    {
        return DB::table('product_variant_attributes')
            ->whereIn('key', $keys)
            ->pluck('id')
            ->all();
    }
}
