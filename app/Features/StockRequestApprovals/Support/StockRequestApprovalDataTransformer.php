<?php

namespace App\Features\StockRequestApprovals\Support;

use App\Models\InventoryItem;
use App\Models\StockRequest;
use App\Models\StockRequestItem;
use App\Models\StockRequestStatusHistory;

class StockRequestApprovalDataTransformer
{
    public const RELATIONS = [
        'warehouse:id,name,warehouse_type',
        'requestor:id,name,email',
        'items:id,stock_request_id,variant_id,quantity,reason',
        'items.variant:id,product_master_id,model_code,sku,condition,color,ram,rom,cpu,gpu,ram_type,rom_type,operating_system,screen',
        'items.variant.productMaster:id,model_id',
        'items.variant.productMaster.model:id,brand_id,model_name',
        'items.variant.productMaster.model.brand:id,name',
        'statusHistories:id,stock_request_id,status,actor_id,occurred_at,notes',
        'statusHistories.actor:id,name,email',
        'approval',
        'approval.approver:id,name,email',
        'approval.items:id,stock_request_approval_id,stock_request_item_id,approved_quantity',
        'approval.items.stockRequestItem:id,stock_request_id,variant_id,quantity,reason',
        'approval.references:id,stock_request_approval_id,reference_type,reference_number',
        'requestForQuotation',
    ];

    /**
     * @param array<int, float> $avgCostByVariant
     */
    public static function transform(StockRequest $request, array $avgCostByVariant = []): array
    {
        $items = $request->items->map(fn (StockRequestItem $item) => self::transformItem($item, $avgCostByVariant))->values()->all();

        $latestAction = $request->statusHistories
            ->filter(fn (StockRequestStatusHistory $history) => $history->status !== 'pending')
            ->sortByDesc('occurred_at')
            ->first();

        $approval = $request->approval;

        return [
            'id' => $request->id,
            'request_number' => $request->request_number,
            'pr_number' => $request->request_number,
            'warehouse_id' => $request->warehouse_id,
            'requested_warehouse_id' => $request->warehouse_id,
            'branch_name' => $request->warehouse?->name,
            'destination_warehouse_name' => $request->warehouse?->name,
            'requestor_id' => $request->requestor_id,
            'requested_by' => $request->requestor?->name ?? $request->requestor?->email,
            'requester_full_name' => $request->requestor?->name ?? $request->requestor?->email,
            'required_at' => optional($request->required_at)?->toIso8601String(),
            'required_date' => optional($request->required_at)?->toIso8601String(),
            'purpose' => $request->purpose,
            'status' => $request->status,
            'notes' => $request->notes,
            'created_at' => optional($request->created_at)?->toIso8601String(),
            'updated_at' => optional($request->updated_at)?->toIso8601String(),
            'approved_date' => optional($approval?->approval_date ?? $latestAction?->occurred_at)?->toIso8601String(),
            'approver_full_name' => $approval?->approver?->name ?? $approval?->approver?->email ?? $latestAction?->actor?->name,
            'items' => $items,
            'total_items' => collect($items)->sum('quantity'),
            'total_estimated_value' => collect($items)->sum(fn (array $item) => ($item['unit_cost'] ?? 0) * ($item['quantity'] ?? 0)),
            'status_history' => $request->statusHistories
                ->sortByDesc('occurred_at')
                ->values()
                ->map(fn (StockRequestStatusHistory $history) => [
                    'id' => $history->id,
                    'status' => $history->status,
                    'actor_id' => $history->actor_id,
                    'actor_name' => $history->actor?->name ?? $history->actor?->email,
                    'timestamp' => optional($history->occurred_at)?->toIso8601String(),
                    'notes' => $history->notes,
                ])
                ->all(),
            'approval_info' => [
                'approver_name' => $approval?->approver?->name ?? $approval?->approver?->email,
                'approval_date' => optional($approval?->approval_date)?->toIso8601String(),
                'action' => $approval?->action,
                'notes' => $approval?->notes,
                'references' => $approval?->references->map(fn ($ref) => [
                    'type' => $ref->reference_type,
                    'reference_number' => $ref->reference_number,
                ])->values()->all() ?? [],
            ],
            'linked_rfq' => $request->requestForQuotation ? [
                'id' => $request->requestForQuotation->id,
                'rfq_number' => $request->requestForQuotation->rfq_number,
                'status' => $request->requestForQuotation->status,
            ] : null,
        ];
    }

    /**
     * @param array<int, float> $avgCostByVariant
     */
    public static function transformItem(StockRequestItem $item, array $avgCostByVariant = []): array
    {
        $variant = $item->variant;
        $master = $variant?->productMaster;
        $model = $master?->model;
        $attributes = $variant?->attributesMap() ?? [];

        $unitCost = (float) ($avgCostByVariant[$item->variant_id] ?? 0);

        return [
            'id' => $item->id,
            'stock_request_item_id' => $item->id,
            'variant_id' => $item->variant_id,
            'quantity' => $item->quantity,
            'reason' => $item->reason,
            'brand' => $model?->brand?->name,
            'model' => $model?->model_name,
            'variant_sku' => $variant?->sku,
            'variant_name' => $variant?->variant_name,
            'condition' => $variant?->condition ?? 'Brand New',
            'variant_attributes' => $attributes,
            'unit_cost' => $unitCost,
        ];
    }

    /** @param array<int> $variantIds @return array<int, float> */
    public static function averageCostByVariant(array $variantIds): array
    {
        if ($variantIds === []) {
            return [];
        }

        return InventoryItem::query()
            ->selectRaw('product_variant_id as variant_id, AVG(cost_price) as avg_cost')
            ->whereIn('product_variant_id', $variantIds)
            ->groupBy('product_variant_id')
            ->pluck('avg_cost', 'variant_id')
            ->map(fn ($value) => (float) $value)
            ->all();
    }
}
