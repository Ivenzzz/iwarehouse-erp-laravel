<?php

namespace App\Features\RequestForQuotations\Support;

use App\Models\RequestForQuotation;
use Illuminate\Database\Eloquent\Builder;

class RequestForQuotationListQuery
{
    public const TAB_STATUS_MAP = [
        'all' => null,
        'draft' => ['draft'],
        'receiving_quotes' => ['receiving_quotes'],
        'converted_to_po' => ['converted_to_po'],
        'consolidated' => ['consolidated'],
    ];

    public const SORTABLE_COLUMNS = [
        'created_at' => 'request_for_quotations.created_at',
        'rfq_number' => 'request_for_quotations.rfq_number',
        'status' => 'request_for_quotations.status',
        'required_at' => 'stock_requests.required_at',
    ];

    public function build(string $search, string $statusTab): Builder
    {
        $query = RequestForQuotation::query()
            ->select('request_for_quotations.*')
            ->leftJoin('stock_requests', 'stock_requests.id', '=', 'request_for_quotations.stock_request_id');

        $this->applyFilters($query, $search, $statusTab);

        return $query;
    }

    public function applyFilters(Builder $query, string $search, string $statusTab): void
    {
        $statuses = self::TAB_STATUS_MAP[$statusTab] ?? null;
        if (is_array($statuses)) {
            $query->whereIn('request_for_quotations.status', $statuses);
        }

        if ($search === '') {
            return;
        }

        $like = '%'.$search.'%';
        $query->where(function (Builder $inner) use ($like) {
            $inner
                ->where('request_for_quotations.rfq_number', 'like', $like)
                ->orWhere('stock_requests.request_number', 'like', $like)
                ->orWhereHas('createdBy', fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
                ->orWhereHas('stockRequest.requestor', fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
                ->orWhereHas('stockRequest.warehouse', fn (Builder $q) => $q->where('name', 'like', $like))
                ->orWhereHas('items.variant', fn (Builder $q) => $q->where('variant_name', 'like', $like)->orWhere('sku', 'like', $like))
                ->orWhereHas('supplierQuotes.supplier', fn (Builder $q) => $q->where('legal_business_name', 'like', $like)->orWhere('trade_name', 'like', $like));
        });
    }
}
