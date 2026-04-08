<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductMaster;
use App\Models\ProductVariant;
use App\Support\GeneratesProductVariantName;
use App\Support\GeneratesProductVariantSku;
use Illuminate\Support\Facades\DB;

class GenerateProductVariants
{
    public function __construct(
        private readonly GeneratesProductVariantSku $skuGenerator,
        private readonly GeneratesProductVariantName $nameGenerator,
        private readonly EnsureProductVariantAttributes $ensureProductVariantAttributes,
    ) {}

    /**
     * @param  array{
     *     conditions: array<int, string>,
     *     colors: array<int, string>,
     *     rams: array<int, string>,
     *     storages: array<int, string>,
     *     shared_attributes: array<string, string>
     * }  $payload
     * @return array{requested: int, created: int, skipped: int}
     */
    public function handle(ProductMaster $productMaster, array $payload): array
    {
        return DB::transaction(function () use ($productMaster, $payload) {
            $productMaster->loadMissing('model.brand', 'subcategory.parent');

            $attributeIds = $this->ensureProductVariantAttributes->handle([
                ...array_keys($payload['shared_attributes']),
                'color',
                'ram',
                'storage',
            ]);

            $existingSkus = ProductVariant::query()
                ->where('product_master_id', $productMaster->id)
                ->pluck('sku')
                ->flip()
                ->all();

            $colors = $payload['colors'] !== [] ? $payload['colors'] : [''];
            $rams = $payload['rams'] !== [] ? $payload['rams'] : [''];
            $storages = $payload['storages'] !== [] ? $payload['storages'] : [''];

            $requested = count($payload['conditions']) * count($colors) * count($rams) * count($storages);
            $created = 0;
            $skipped = 0;

            foreach ($payload['conditions'] as $condition) {
                foreach ($colors as $color) {
                    foreach ($rams as $ram) {
                        foreach ($storages as $storage) {
                            $canonicalAttributes = [
                                'color' => $color,
                                'ram' => $ram,
                                'storage' => $storage,
                            ];
                            $sku = $this->skuGenerator->fromAttributes(
                                $productMaster,
                                $condition,
                                $canonicalAttributes,
                            );

                            if (isset($existingSkus[$sku])) {
                                $skipped++;

                                continue;
                            }

                            $variant = ProductVariant::create([
                                'product_master_id' => $productMaster->id,
                                'variant_name' => $this->nameGenerator->fromAttributes(
                                    $productMaster,
                                    $condition,
                                    $canonicalAttributes,
                                ),
                                'sku' => $sku,
                                'condition' => $condition,
                                'is_active' => true,
                            ]);

                            $this->syncValues(
                                $variant,
                                [
                                    ...$canonicalAttributes,
                                    ...$payload['shared_attributes'],
                                ],
                                $attributeIds,
                            );

                            $existingSkus[$sku] = true;
                            $created++;
                        }
                    }
                }
            }

            return [
                'requested' => $requested,
                'created' => $created,
                'skipped' => $skipped,
            ];
        });
    }

    /**
     * @param  array<string, string>  $values
     * @param  array<string, int>  $attributeIds
     */
    private function syncValues(ProductVariant $variant, array $values, array $attributeIds): void
    {
        foreach ($values as $key => $value) {
            $value = trim($value);
            $attributeId = $attributeIds[$key] ?? null;

            if ($attributeId === null || $value === '') {
                continue;
            }

            $variant->values()->updateOrCreate(
                ['product_variant_attribute_id' => $attributeId],
                ['value' => $value],
            );
        }
    }
}
