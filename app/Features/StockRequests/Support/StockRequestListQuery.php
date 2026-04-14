<?php

namespace App\Features\StockRequests\Support;

use App\Models\StockRequest;
use Illuminate\Database\Eloquent\Builder;

class StockRequestListQuery
{
    public const TAB_STATUS_MAP = [
        'Pending' => ['pending'],
        'Approved' => ['rfq_created', 'stock_transfer_created', 'split_operation_created'],
        'Rejected' => ['declined'],
    ];

    public const SORTABLE_COLUMNS = [
        'created_at' => 'stock_requests.created_at',
        'required_at' => 'stock_requests.required_at',
        'request_number' => 'stock_requests.request_number',
        'status' => 'stock_requests.status',
        'purpose' => 'stock_requests.purpose',
    ];

    public function build(string $search, string $statusTab): Builder
    {
        $query = StockRequest::query();
        $this->applyFilters($query, $search, $statusTab);

        return $query;
    }

    public function applyFilters(Builder $query, string $search, string $statusTab): void
    {
        if ($statusTab !== 'All') {
            $query->whereIn('stock_requests.status', self::TAB_STATUS_MAP[$statusTab] ?? []);
        }

        if ($search === '') {
            return;
        }

        $query->where(function (Builder $inner) use ($search) {
            $like = '%'.$search.'%';
            $inner->where('stock_requests.request_number', 'like', $like)
                ->orWhere('stock_requests.purpose', 'like', $like)
                ->orWhere('stock_requests.notes', 'like', $like)
                ->orWhereHas('warehouse', fn (Builder $q) => $q->where('name', 'like', $like))
                ->orWhereHas('requestor', fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
                ->orWhereHas('items.variant', fn (Builder $q) => $q
                    ->where('sku', 'like', $like)
                    ->orWhere('model_code', 'like', $like)
                    ->orWhere('ram', 'like', $like)
                    ->orWhere('rom', 'like', $like)
                    ->orWhere('color', 'like', $like))
                ->orWhereHas('items.variant.productMaster.model.brand', fn (Builder $q) => $q->where('name', 'like', $like))
                ->orWhereHas('items.variant.productMaster.model', fn (Builder $q) => $q->where('model_name', 'like', $like));
        });
    }
}
