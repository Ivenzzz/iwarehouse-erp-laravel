<?php

namespace App\Features\StockRequestApprovals\Support;

use App\Models\StockRequest;
use Illuminate\Database\Eloquent\Builder;

class StockRequestApprovalListQuery
{
    public const TAB_STATUS_MAP = [
        'pending' => ['pending'],
        'approved' => ['rfq_created', 'stock_transfer_created', 'split_operation_created'],
        'declined' => ['declined'],
        'all' => StockRequest::STATUSES,
    ];

    public const SORTABLE_COLUMNS = [
        'created_at' => 'stock_requests.created_at',
        'required_at' => 'stock_requests.required_at',
        'request_number' => 'stock_requests.request_number',
        'status' => 'stock_requests.status',
        'approval_date' => 'stock_request_approvals.approval_date',
    ];

    public function build(string $search, string $statusTab, ?int $storeId): Builder
    {
        $query = StockRequest::query()
            ->leftJoin('stock_request_approvals', 'stock_request_approvals.stock_request_id', '=', 'stock_requests.id')
            ->select('stock_requests.*');

        $this->applyFilters($query, $search, $statusTab, $storeId);

        return $query;
    }

    public function applyFilters(Builder $query, string $search, string $statusTab, ?int $storeId): void
    {
        $statuses = self::TAB_STATUS_MAP[$statusTab] ?? self::TAB_STATUS_MAP['all'];
        if ($statusTab !== 'all') {
            $query->whereIn('stock_requests.status', $statuses);
        }

        if ($storeId !== null) {
            $query->where('stock_requests.warehouse_id', $storeId);
        }

        if ($search === '') {
            return;
        }

        $like = '%'.$search.'%';

        $query->where(function (Builder $inner) use ($like): void {
            $inner->where('stock_requests.request_number', 'like', $like)
                ->orWhere('stock_requests.purpose', 'like', $like)
                ->orWhere('stock_requests.notes', 'like', $like)
                ->orWhereHas('warehouse', fn (Builder $q) => $q->where('name', 'like', $like))
                ->orWhereHas('requestor', fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like));
        });
    }
}
