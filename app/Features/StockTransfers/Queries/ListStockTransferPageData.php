<?php

namespace App\Features\StockTransfers\Queries;

use App\Features\CompanyInfo\Support\CompanyInfoDataTransformer;
use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Features\StockTransfers\Support\StockTransferDataTransformer;
use App\Models\CompanyInfo;
use App\Models\StockTransfer;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class ListStockTransferPageData
{
    public function __invoke(Request $request): array
    {
        return [
            'transfers' => StockTransfer::query()
                ->with(StockTransferDataTransformer::RELATIONS)
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (StockTransfer $transfer) => StockTransferDataTransformer::transformTransfer($transfer))
                ->values(),
            'warehouses' => Warehouse::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Warehouse $warehouse) => InventoryDataTransformer::transformWarehouse($warehouse))
                ->values(),
            'companyInfo' => CompanyInfoDataTransformer::transform(CompanyInfo::query()->latest()->first()),
        ];
    }
}
