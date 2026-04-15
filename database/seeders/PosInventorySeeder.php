<?php

namespace Database\Seeders;

use App\Models\InventoryItem;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class PosInventorySeeder extends Seeder
{
    public function run(): void
    {
        $mainBranch = Warehouse::query()->where('name', 'Main Branch')->firstOrFail();
        $annexBranch = Warehouse::query()->where('name', 'Annex Branch')->firstOrFail();

        $iphoneVariant = ProductVariant::query()->where('sku', 'APPLE-IP15-8GB-256GB-BLACK')->firstOrFail();
        $samsungVariant = ProductVariant::query()->where('sku', 'SAMSUNG-A55-8GB-256GB-ICEBLUE')->firstOrFail();
        $chargerVariant = ProductVariant::query()->where('sku', 'ANKER-NANO-20W-WHITE')->firstOrFail();

        $this->seedInventoryItem(
            imei: '351111111111111',
            serialNumber: 'IP15-MAIN-001',
            variantId: $iphoneVariant->id,
            warehouseId: $mainBranch->id,
            status: 'available',
            costPrice: 40500,
            cashPrice: 44990,
            srpPrice: 45990,
            warranty: '7 days replacement, 1 year service warranty',
            daysAgo: 10,
        );

        $this->seedInventoryItem(
            imei: '351111111111129',
            serialNumber: 'IP15-MAIN-002',
            variantId: $iphoneVariant->id,
            warehouseId: $mainBranch->id,
            status: 'available',
            costPrice: 40500,
            cashPrice: 44990,
            srpPrice: 45990,
            warranty: '7 days replacement, 1 year service warranty',
            daysAgo: 8,
        );

        $this->seedInventoryItem(
            imei: '352222222222222',
            serialNumber: 'A55-MAIN-001',
            variantId: $samsungVariant->id,
            warehouseId: $mainBranch->id,
            status: 'available',
            costPrice: 17900,
            cashPrice: 19990,
            srpPrice: 20990,
            warranty: '7 days replacement, 1 year service warranty',
            daysAgo: 6,
        );

        $this->seedInventoryItem(
            imei: '352222222222230',
            serialNumber: 'A55-ANNEX-001',
            variantId: $samsungVariant->id,
            warehouseId: $annexBranch->id,
            status: 'available',
            costPrice: 17900,
            cashPrice: 20190,
            srpPrice: 21290,
            warranty: '7 days replacement, 1 year service warranty',
            daysAgo: 5,
        );

        $this->seedInventoryItem(
            imei: null,
            serialNumber: 'CHARGER-MAIN-001',
            variantId: $chargerVariant->id,
            warehouseId: $mainBranch->id,
            status: 'available',
            costPrice: 480,
            cashPrice: 790,
            srpPrice: 890,
            warranty: '30 days service warranty',
            daysAgo: 4,
        );
    }

    private function seedInventoryItem(
        ?string $imei,
        string $serialNumber,
        int $variantId,
        int $warehouseId,
        string $status,
        float $costPrice,
        float $cashPrice,
        float $srpPrice,
        string $warranty,
        int $daysAgo,
    ): void {
        InventoryItem::query()->updateOrCreate(
            ['serial_number' => $serialNumber],
            [
                'product_variant_id' => $variantId,
                'warehouse_id' => $warehouseId,
                'imei' => $imei,
                'status' => $status,
                'cost_price' => $costPrice,
                'cash_price' => $cashPrice,
                'srp_price' => $srpPrice,
                'warranty' => $warranty,
                'encoded_at' => now()->subDays($daysAgo),
                'grn_number' => 'GRN-POS-'.$warehouseId,
            ],
        );
    }
}
