<?php

namespace Tests\Unit;

use App\Features\GoodsReceipts\Http\Controllers\GoodsReceiptController;
use Illuminate\Validation\ValidationException;
use ReflectionMethod;
use Tests\TestCase;

class GoodsReceiptControllerMergeValidatedPurchaseRowsTest extends TestCase
{
    public function test_merge_passes_through_full_rows_when_ids_match(): void
    {
        $controller = app(GoodsReceiptController::class);
        $method = new ReflectionMethod(GoodsReceiptController::class, 'mergeValidatedPurchaseRows');
        $method->setAccessible(true);

        $stubRows = [['product_master_id' => 10, 'variant_id' => 20]];
        $fullRows = [
            [
                'product_master_id' => 10,
                'variant_id' => 20,
                'rowIndex' => 2,
                'row' => ['Model' => 'X', 'IMEI 1' => '350000000000001'],
                'imei1' => '350000000000001',
            ],
        ];

        $result = $method->invoke($controller, $stubRows, $fullRows);

        $this->assertSame('350000000000001', $result[0]['imei1']);
        $this->assertArrayHasKey('row', $result[0]);
        $this->assertSame(2, $result[0]['rowIndex']);
    }

    public function test_merge_throws_when_variant_id_mismatches(): void
    {
        $controller = app(GoodsReceiptController::class);
        $method = new ReflectionMethod(GoodsReceiptController::class, 'mergeValidatedPurchaseRows');
        $method->setAccessible(true);

        $stubRows = [['product_master_id' => 10, 'variant_id' => 20]];
        $fullRows = [
            [
                'product_master_id' => 10,
                'variant_id' => 99,
                'imei1' => 'x',
            ],
        ];

        $this->expectException(ValidationException::class);
        $method->invoke($controller, $stubRows, $fullRows);
    }
}
