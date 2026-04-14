<?php

namespace App\Features\PurchaseOrders\Support;

use App\Models\PurchaseOrder;
use Illuminate\Database\Eloquent\Builder;

class PurchaseOrderListQuery
{
    public const TAB_STATUS_MAP = [
        'all' => null,
        'pending' => ['pending'],
        'approved' => ['approved'],
        'rejected' => ['rejected'],
    ];

    public const SORTABLE_COLUMNS = [
        'created_at' => 'purchase_orders.created_at',
        'po_number' => 'purchase_orders.po_number',
        'status' => 'purchase_orders.status',
        'expected_delivery_date' => 'purchase_orders.expected_delivery_date',
        'supplier_name' => 'suppliers.legal_business_name',
    ];

    public function build(string $search, string $statusTab): Builder
    {
        $query = PurchaseOrder::query()
            ->select('purchase_orders.*')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'purchase_orders.supplier_id')
            ->leftJoin('request_for_quotations', 'request_for_quotations.id', '=', 'purchase_orders.rfq_id');

        $this->applyFilters($query, $search, $statusTab);

        return $query;
    }

    public function applyFilters(Builder $query, string $search, string $statusTab): void
    {
        $statuses = self::TAB_STATUS_MAP[$statusTab] ?? null;
        if (is_array($statuses)) {
            $query->whereIn('purchase_orders.status', $statuses);
        }

        if ($search === '') {
            return;
        }

        $like = '%'.$search.'%';
        $query->where(function (Builder $inner) use ($like) {
            $inner
                ->where('purchase_orders.po_number', 'like', $like)
                ->orWhere('request_for_quotations.rfq_number', 'like', $like)
                ->orWhere('suppliers.legal_business_name', 'like', $like)
                ->orWhere('suppliers.trade_name', 'like', $like);
        });
    }
}

