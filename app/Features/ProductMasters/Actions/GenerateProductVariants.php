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
    ) {}

    /**
     * @param  array{
     *     conditions: array<int, string>,
     *     colors: array<int, string>,
     *     rams: array<int, string>,
     *     roms: array<int, string>,
     *     shared_attributes: array<string, string>
     * }  $payload
     * @return array{requested: int, created: int, skipped: int}
     */
    public function handle(ProductMaster $productMaster, array $payload): array
    {
        return DB::transaction(function () use ($productMaster, $payload) {
            $productMaster->loadMissing('model.brand', 'subcategory.parent');

            $existingSkus = ProductVariant::query()
                ->where('product_master_id', $productMaster->id)
                ->pluck('sku')
                ->flip()
                ->all();

            $colors = $payload['colors'] !== [] ? $payload['colors'] : [''];
            $rams = $payload['rams'] !== [] ? $payload['rams'] : [''];
            $roms = $payload['roms'] !== [] ? $payload['roms'] : [''];

            $requested = count($payload['conditions']) * count($colors) * count($rams) * count($roms);
            $created = 0;
            $skipped = 0;

            foreach ($payload['conditions'] as $condition) {
                foreach ($colors as $color) {
                    foreach ($rams as $ram) {
                        foreach ($roms as $rom) {
                            $canonicalAttributes = [
                                'color' => $color,
                                'ram' => $ram,
                                'rom' => $rom,
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
                                ...$this->filledAttributes([
                                    ...$canonicalAttributes,
                                    ...$payload['shared_attributes'],
                                ]),
                                'is_active' => true,
                            ]);

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

    /** @param array<string, string> $values */
    private function filledAttributes(array $values): array
    {
        $attributes = [];

        foreach ($values as $key => $value) {
            $value = trim($value);

            if ($value === '') {
                continue;
            }

            $attributes[$key] = $value;
        }

        return $attributes;
    }
}
