<?php

namespace App\Features\GoodsReceipts\Support;

use App\Models\DeliveryReceipt;
use App\Models\GoodsReceipt;
use Illuminate\Database\Eloquent\Builder;

class GoodsReceiptListQuery
{
    private const DR_SORT_MAP = [
        'date_received' => 'delivery_receipts.date_received',
        'dr_number' => 'delivery_receipts.dr_number',
        'supplier_name' => 'suppliers.legal_business_name',
        'status' => 'delivery_receipts.has_goods_receipt',
    ];

    private const GRN_SORT_MAP = [
        'created_at' => 'goods_receipts.created_at',
        'grn_number' => 'goods_receipts.grn_number',
        'status' => 'goods_receipts.status',
        'supplier_name' => 'suppliers.legal_business_name',
    ];

    public function pendingDeliveryReceipts(string $search, string $sort, string $direction): Builder
    {
        $sortColumn = self::DR_SORT_MAP[$sort] ?? self::DR_SORT_MAP['date_received'];
        $sortDirection = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        $query = DeliveryReceipt::query()
            ->select('delivery_receipts.*')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'delivery_receipts.supplier_id')
            ->where('delivery_receipts.has_goods_receipt', false)
            ->where('delivery_receipts.has_variance', false);

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('delivery_receipts.dr_number', 'like', $like)
                    ->orWhere('delivery_receipts.reference_number', 'like', $like)
                    ->orWhere('suppliers.legal_business_name', 'like', $like)
                    ->orWhere('suppliers.trade_name', 'like', $like);
            });
        }

        return $query->orderBy($sortColumn, $sortDirection);
    }

    public function goodsReceipts(string $search, string $supplierId, string $sort, string $direction): Builder
    {
        $sortColumn = self::GRN_SORT_MAP[$sort] ?? self::GRN_SORT_MAP['created_at'];
        $sortDirection = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        $query = GoodsReceipt::query()
            ->select('goods_receipts.*')
            ->join('delivery_receipts', 'delivery_receipts.id', '=', 'goods_receipts.delivery_receipt_id')
            ->leftJoin('suppliers', 'suppliers.id', '=', 'delivery_receipts.supplier_id');

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function (Builder $builder) use ($like): void {
                $builder
                    ->where('goods_receipts.grn_number', 'like', $like)
                    ->orWhere('delivery_receipts.dr_number', 'like', $like)
                    ->orWhere('suppliers.legal_business_name', 'like', $like)
                    ->orWhere('suppliers.trade_name', 'like', $like);
            });
        }

        if ($supplierId !== '' && $supplierId !== 'all') {
            $query->where('delivery_receipts.supplier_id', $supplierId);
        }

        return $query->orderBy($sortColumn, $sortDirection);
    }
}
