<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductMaster;
use App\Models\ProductBrand;
use App\Models\ProductModel;
use App\Models\ProductSpecDefinition;
use App\Support\GeneratesProductMasterSku;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SaveProductMaster
{
    public function __construct(private readonly GeneratesProductMasterSku $skuGenerator) {}

    /**
     * @param  array{
     *     brand_id: int|null,
     *     model_id: int|null,
     *     new_brand_name: string|null,
     *     new_model_name: string|null,
     *     subcategory_id: int,
     *     description: string|null,
     *     clear_image: bool,
     *     specs: array<string, string>
     * }  $payload
     */
    public function handle(array $payload, ?UploadedFile $image = null, ?ProductMaster $productMaster = null): ProductMaster
    {
        return DB::transaction(function () use ($payload, $image, $productMaster) {
            $model = $this->resolveModel($payload);
            $imagePath = $productMaster?->image_path;
            $oldImagePath = null;

            if ($image !== null) {
                $oldImagePath = $imagePath;
                $imagePath = $image->store('product-masters', 'public');
            } elseif ($payload['clear_image']) {
                $oldImagePath = $imagePath;
                $imagePath = null;
            }

            $attributes = [
                'master_sku' => $this->skuGenerator->fromModel($model),
                'model_id' => $model->id,
                'subcategory_id' => $payload['subcategory_id'],
                'image_path' => $imagePath,
                'description' => $payload['description'],
            ];

            if ($productMaster === null) {
                $productMaster = ProductMaster::create($attributes);
            } else {
                $productMaster->update($attributes);
            }

            $this->syncSpecs($productMaster, $payload['specs']);

            if ($oldImagePath !== null && $oldImagePath !== $imagePath) {
                Storage::disk('public')->delete($oldImagePath);
            }

            return $productMaster;
        });
    }

    /**
     * @param  array{
     *     brand_id: int|null,
     *     model_id: int|null,
     *     new_brand_name: string|null,
     *     new_model_name: string|null
     * }  $payload
     */
    private function resolveModel(array $payload): ProductModel
    {
        if ($payload['model_id'] !== null) {
            return ProductModel::with('brand')->findOrFail($payload['model_id']);
        }

        $brand = $payload['brand_id'] !== null
            ? ProductBrand::query()->findOrFail($payload['brand_id'])
            : ProductBrand::query()->create([
                'name' => $payload['new_brand_name'],
            ]);

        $model = $brand->models()->create([
            'model_name' => $payload['new_model_name'],
        ]);

        $model->setRelation('brand', $brand);

        return $model;
    }

    /**
     * @param  array<string, string>  $specs
     */
    private function syncSpecs(ProductMaster $productMaster, array $specs): void
    {
        $definitions = ProductSpecDefinition::query()
            ->whereIn('key', array_keys($specs))
            ->get()
            ->keyBy('key');

        $definitionIds = $definitions->pluck('id');

        $productMaster->specValues()
            ->when($definitionIds->isNotEmpty(), fn ($query) => $query->whereNotIn('product_spec_definition_id', $definitionIds))
            ->when($definitionIds->isEmpty(), fn ($query) => $query)
            ->delete();

        foreach ($specs as $key => $value) {
            $definition = $definitions->get($key);

            if ($definition === null) {
                continue;
            }

            $productMaster->specValues()->updateOrCreate(
                ['product_spec_definition_id' => $definition->id],
                ['value' => $value],
            );
        }
    }
}
