<?php

namespace App\Features\Inventory\Actions;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Features\Inventory\Support\InventoryListQuery;
use App\Models\GoodsReceipt;
use App\Models\InventoryItem;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportInventoryCsv
{
    public function __construct(
        private readonly InventoryListQuery $inventoryListQuery,
    ) {
    }

    public function handle(Request $request): StreamedResponse
    {
        $filters = $this->inventoryListQuery->filtersFromRequest($request);

        $query = $this->inventoryListQuery->applySorting(
            $this->inventoryListQuery->query($filters),
            $filters,
        );

        $this->inventoryListQuery->withInventoryRelations($query);

        $inventory = $query->get();

        if (
            $inventory->isEmpty()
            && $this->inventoryListQuery->isIdentifierSearch($filters['search'])
        ) {
            $inventory = $this->inventoryListQuery->applySorting(
                $this->inventoryListQuery->applyExactIdentifierFilter(
                    $this->inventoryListQuery->query([
                        ...$filters,
                        'location' => 'all',
                        'status' => 'all',
                        'brand' => 'all',
                        'category' => 'all',
                        'condition' => 'all',
                        'stockAge' => 'all',
                        'search' => '',
                    ], includeSearch: false),
                    $filters['search'],
                ),
                $filters,
            );

            $this->inventoryListQuery->withInventoryRelations($inventory);
            $inventory = $inventory->get();
        }

        $rows = $inventory
            ->map(fn (InventoryItem $item) => InventoryDataTransformer::transformInventoryItem($item))
            ->values();

        $supplierByGrn = $this->supplierByGrn($rows);

        $callback = function () use ($rows, $supplierByGrn): void {
            $stream = fopen('php://output', 'w');

            fputcsv($stream, [
                'Brand',
                'Model',
                'Model Code',
                'Category',
                'Subcategory',
                'RAM',
                'ROM',
                'Color',
                'Condition',
                'CPU',
                'GPU',
                'RAM Type',
                'ROM Type',
                'Operating System',
                'Screen',
                'Warehouse Name',
                'IMEI1',
                'IMEI2',
                'Serial Number',
                'Status',
                'Cost Price',
                'Cash Price',
                'SRP Price',
                'Warranty',
                'Encoded At',
                'GRN Number',
                'Supplier',
            ]);

            foreach ($rows as $item) {
                $grnNumber = trim((string) ($item['grn_number'] ?? ''));

                fputcsv($stream, [
                    $item['brandName'],
                    $item['masterModel'],
                    $item['model_code'] ?? '',
                    $item['categoryName'] ?? '',
                    $item['subcategoryName'] ?? '',
                    $item['attrRAM'],
                    $item['attrROM'],
                    $item['attrColor'],
                    $item['variantCondition'],
                    $item['cpu'],
                    $item['gpu'],
                    $item['ram_type'] ?? '',
                    $item['rom_type'] ?? '',
                    $item['operating_system'] ?? '',
                    $item['screen'] ?? '',
                    $item['warehouseName'],
                    $item['imei1'],
                    $item['imei2'],
                    $item['serial_number'],
                    $item['status'],
                    $item['cost_price'],
                    $item['cash_price'],
                    $item['srp'],
                    $item['warranty_description'],
                    $item['encoded_date'],
                    $grnNumber,
                    $grnNumber !== '' ? ($supplierByGrn[$grnNumber] ?? '') : '',
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'inventory.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @param \Illuminate\Support\Collection<int, array<string, mixed>> $rows
     * @return array<string, string>
     */
    private function supplierByGrn($rows): array
    {
        $grnNumbers = $rows
            ->pluck('grn_number')
            ->map(fn (mixed $value) => trim((string) $value))
            ->filter(fn (string $value) => $value !== '')
            ->unique()
            ->values();

        if ($grnNumbers->isEmpty()) {
            return [];
        }

        return GoodsReceipt::query()
            ->select('goods_receipts.grn_number', 'suppliers.legal_business_name', 'suppliers.trade_name')
            ->join('delivery_receipts', 'delivery_receipts.id', '=', 'goods_receipts.delivery_receipt_id')
            ->join('suppliers', 'suppliers.id', '=', 'delivery_receipts.supplier_id')
            ->whereIn('goods_receipts.grn_number', $grnNumbers->all())
            ->get()
            ->mapWithKeys(fn (GoodsReceipt $goodsReceipt) => [
                $goodsReceipt->grn_number => trim((string) ($goodsReceipt->legal_business_name ?: $goodsReceipt->trade_name)),
            ])
            ->all();
    }
}
