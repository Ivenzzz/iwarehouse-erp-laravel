<?php

namespace App\Features\Inventory\Actions;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Features\Inventory\Support\InventoryListQuery;
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
                        'stockAge' => 'all',
                        'search' => '',
                    ], includeSearch: false),
                    $filters['search'],
                ),
                $filters,
            )->get();
        }

        $rows = $inventory
            ->map(fn (InventoryItem $item) => InventoryDataTransformer::transformInventoryItem($item))
            ->values();

        $callback = function () use ($rows): void {
            $stream = fopen('php://output', 'w');

            fputcsv($stream, [
                'Brand',
                'Model',
                'Variant',
                'Condition',
                'Warehouse',
                'Status',
                'IMEI 1',
                'IMEI 2',
                'Serial Number',
                'Cost',
                'Cash',
                'SRP',
                'Warranty',
                'CPU',
                'GPU',
                'RAM',
                'ROM',
                'Color',
                'Category',
                'GRN Number',
                'Purchase Reference',
                'Encoded Date',
                'Created Date',
            ]);

            foreach ($rows as $item) {
                fputcsv($stream, [
                    $item['brandName'],
                    $item['masterModel'],
                    $item['productName'],
                    $item['variantCondition'],
                    $item['warehouseName'],
                    $item['status'],
                    $item['imei1'],
                    $item['imei2'],
                    $item['serial_number'],
                    $item['cost_price'],
                    $item['cash_price'],
                    $item['srp'],
                    $item['warranty_description'],
                    $item['cpu'],
                    $item['gpu'],
                    $item['attrRAM'],
                    $item['attrROM'],
                    $item['attrColor'],
                    $item['categoryName'] ?? '',
                    $item['grn_number'],
                    $item['purchase'],
                    $item['encoded_date'],
                    $item['created_date'],
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'inventory.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
