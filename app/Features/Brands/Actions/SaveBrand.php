<?php

namespace App\Features\Brands\Actions;

use App\Models\ProductBrand;
use Illuminate\Support\Facades\DB;

class SaveBrand
{
    public function __construct(private readonly SyncBrandModels $syncBrandModels)
    {
    }

    /**
     * @param  array{name: string, models: array<int, array{id: int|null, model_name: string}>}  $payload
     */
    public function handle(array $payload, ?ProductBrand $brand = null): ProductBrand
    {
        return DB::transaction(function () use ($payload, $brand) {
            $brand ??= ProductBrand::create([
                'name' => $payload['name'],
            ]);

            if (! $brand->wasRecentlyCreated) {
                $brand->update([
                    'name' => $payload['name'],
                ]);
            }

            $this->syncBrandModels->handle($brand, $payload['models']);

            return $brand;
        });
    }
}
