<?php

namespace App\Features\PurchaseOrders\Actions;

use App\Models\ProductMaster;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;

class SearchPurchaseOrderProductOptions
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function handle(string $search, int $limit = 30): array
    {
        $search = trim($search);
        if (mb_strlen($search) < 2) {
            return [];
        }

        $like = '%'.$search.'%';
        $masters = ProductMaster::query()
            ->with(['model.brand'])
            ->whereHas('model', function ($modelQ) use ($like) {
                $modelQ->where('model_name', 'like', $like)
                    ->orWhereHas('brand', fn ($brandQ) => $brandQ->where('name', 'like', $like));
            })
            ->orWhere('master_sku', 'like', $like)
            ->limit($limit)
            ->get();

        if ($masters->isEmpty()) {
            return [];
        }

        $masterIds = $masters->pluck('id')->all();
        $variantsByMaster = ProductVariant::query()
            ->whereIn('product_master_id', $masterIds)
            ->where('is_active', true)
            ->get(['product_master_id', 'model_code', 'condition', 'ram', 'rom'])
            ->groupBy('product_master_id');

        return $masters
            ->flatMap(function (ProductMaster $master) use ($variantsByMaster): array {
                $title = $this->masterTitle($master);
                $fallback = $title !== '' ? $title : ($master->master_sku ?? 'Unknown Product');
                $variants = $variantsByMaster->get($master->id, collect());
                $specCombos = $this->aggregateSpecs($variants);

                return $specCombos->map(function (array $spec) use ($master, $fallback): array {
                    $chips = array_values(array_filter([
                        $spec['condition'],
                        $spec['ram'],
                        $spec['rom'],
                    ], fn (string $value) => $value !== ''));
                    $specLabel = $chips !== [] ? implode(' | ', $chips) : 'No specs';
                    $label = $fallback.($chips !== [] ? ' - '.$specLabel : '');

                    return [
                        'value' => $this->buildCompositeValue((int) $master->id, $spec),
                        'label' => $label,
                        'title' => $this->masterTitleWithModelCode($master, $spec['model_code']),
                        'product_master_id' => (int) $master->id,
                        'variant_id' => null,
                        'product_spec' => [
                            'model_code' => $spec['model_code'],
                            'ram' => $spec['ram'],
                            'rom' => $spec['rom'],
                            'condition' => $spec['condition'],
                        ],
                    ];
                })->all();
            })
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, ProductVariant>  $variants
     * @return Collection<int, array{model_code:string,condition:string,ram:string,rom:string}>
     */
    private function aggregateSpecs(Collection $variants): Collection
    {
        return $variants
            ->groupBy(function (ProductVariant $variant): string {
                $modelCode = $this->normalizeSpecValue($variant->model_code);
                $condition = $this->normalizeSpecValue($variant->condition);
                $ram = $this->normalizeSpecValue($variant->ram);
                $rom = $this->normalizeSpecValue($variant->rom);

                return implode('|', [$modelCode, $condition, $ram, $rom]);
            })
            ->map(function (Collection $group): array {
                /** @var ProductVariant $first */
                $first = $group->first();

                return [
                    'model_code' => $this->cleanSpecValue($first->model_code),
                    'condition' => $this->cleanSpecValue($first->condition),
                    'ram' => $this->cleanSpecValue($first->ram),
                    'rom' => $this->cleanSpecValue($first->rom),
                ];
            })
            ->sortBy([
                fn (array $spec) => strtolower($spec['condition']),
                fn (array $spec) => strtolower($spec['ram']),
                fn (array $spec) => strtolower($spec['rom']),
            ])
            ->values();
    }

    /**
     * @param  array{model_code:string,condition:string,ram:string,rom:string}  $spec
     */
    private function buildCompositeValue(int $masterId, array $spec): string
    {
        return implode('|', [
            $masterId,
            $this->normalizeSpecValue($spec['model_code']),
            $this->normalizeSpecValue($spec['condition']),
            $this->normalizeSpecValue($spec['ram']),
            $this->normalizeSpecValue($spec['rom']),
        ]);
    }

    private function normalizeSpecValue(mixed $value): string
    {
        return strtolower(trim((string) ($value ?? '')));
    }

    private function cleanSpecValue(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function masterTitle(ProductMaster $master): string
    {
        return trim(implode(' ', array_filter([
            $master->model?->brand?->name,
            $master->model?->model_name,
        ])));
    }

    private function masterTitleWithModelCode(ProductMaster $master, string $modelCode): string
    {
        return trim(implode(' ', array_filter([
            $master->model?->brand?->name,
            $master->model?->model_name,
            trim($modelCode) !== '' ? $modelCode : null,
        ])));
    }
}
