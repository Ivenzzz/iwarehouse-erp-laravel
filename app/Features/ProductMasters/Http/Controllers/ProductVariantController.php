<?php

namespace App\Features\ProductMasters\Http\Controllers;

use App\Features\ProductMasters\Actions\DeleteProductVariant;
use App\Features\ProductMasters\Actions\GenerateProductVariants;
use App\Features\ProductMasters\Actions\SaveProductVariant;
use App\Features\ProductMasters\Http\Requests\GenerateProductVariantsRequest;
use App\Features\ProductMasters\Http\Requests\UpdateProductVariantRequest;
use App\Features\ProductMasters\Queries\ListProductVariants;
use App\Http\Controllers\Controller;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ProductVariantController extends Controller
{
    public function index(
        ProductMaster $productMaster,
        ListProductVariants $listProductVariants,
    ): JsonResponse {
        return response()->json($listProductVariants(request(), $productMaster));
    }

    public function generate(
        GenerateProductVariantsRequest $request,
        ProductMaster $productMaster,
        GenerateProductVariants $generateProductVariants,
    ): JsonResponse {
        return response()->json([
            'message' => 'Variants generated successfully.',
            'summary' => $generateProductVariants->handle($productMaster, $request->payload()),
        ]);
    }

    public function update(
        UpdateProductVariantRequest $request,
        ProductMaster $productMaster,
        ProductVariant $productVariant,
        SaveProductVariant $saveProductVariant,
    ): JsonResponse {
        $this->ensureVariantBelongsToMaster($productMaster, $productVariant);

        $variant = $saveProductVariant->handle($productVariant, $request->payload());

        return response()->json([
            'message' => 'Variant updated successfully.',
            'variant' => ListProductVariants::transformVariant($variant),
        ]);
    }

    public function destroy(
        ProductMaster $productMaster,
        ProductVariant $productVariant,
        DeleteProductVariant $deleteProductVariant,
    ): Response {
        $this->ensureVariantBelongsToMaster($productMaster, $productVariant);
        $deleteProductVariant->handle($productVariant);

        return response()->noContent();
    }

    private function ensureVariantBelongsToMaster(
        ProductMaster $productMaster,
        ProductVariant $productVariant,
    ): void {
        abort_unless($productVariant->product_master_id === $productMaster->id, 404);
    }
}
