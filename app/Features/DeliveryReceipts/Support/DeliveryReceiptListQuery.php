<?php

namespace App\Features\DeliveryReceipts\Support;

use App\Models\DeliveryReceipt;
use App\Models\PurchaseOrder;
use Illuminate\Database\Eloquent\Builder;

class DeliveryReceiptListQuery
{
    public const DR_SORTABLE_COLUMNS = [
        'date_received' => 'delivery_receipts.date_received',
        'dr_number' => 'delivery_receipts.dr_number',
        'supplier_name' => 'suppliers.legal_business_name',
        'total_landed_cost' => 'delivery_receipts.total_landed_cost',
        'status' => 'delivery_receipts.has_goods_receipt',
    ];

    public const PO_SORTABLE_COLUMNS = [
        'expected_delivery_date' => 'purchase_orders.expected_delivery_date',
        'po_number' => 'purchase_orders.po_number',
        'supplier_name' => 'suppliers.legal_business_name',
        'status' => 'purchase_orders.status',
    ];

    public function deliveryReceipts(
        string $search,
        string $status,
        string $sort,
        string $direction
    ): Builder {
        $query = DeliveryReceipt::query()
            ->select('delivery_receipts.*')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'delivery_receipts.supplier_id');

        if ($status !== 'all') {
            if ($status === 'completed') {
                $query->where('delivery_receipts.has_goods_receipt', true);
            } elseif ($status === 'with_variance') {
                $query->where('delivery_receipts.has_variance', true);
            } elseif ($status === 'ready_for_warehouse') {
                $query->where('delivery_receipts.has_goods_receipt', false)->where('delivery_receipts.has_variance', false);
            }
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function (Builder $inner) use ($like) {
                $inner
                    ->where('delivery_receipts.dr_number', 'like', $like)
                    ->orWhere('delivery_receipts.reference_number', 'like', $like)
                    ->orWhere('suppliers.legal_business_name', 'like', $like)
                    ->orWhere('suppliers.trade_name', 'like', $like);
            });
        }

        return $query->orderBy(self::DR_SORTABLE_COLUMNS[$sort], $direction);
    }

    public function incomingPurchaseOrders(
        string $search,
        string $timeFilter,
        string $warehouseFilter,
        string $sort,
        string $direction
    ): Builder {
        $query = PurchaseOrder::query()
            ->select('purchase_orders.*')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchase_orders.supplier_id')
            ->where('purchase_orders.status', 'approved')
            ->where('purchase_orders.has_delivery_receipt', false);

        return $query->orderBy(self::PO_SORTABLE_COLUMNS[$sort], $direction);
    }
}
