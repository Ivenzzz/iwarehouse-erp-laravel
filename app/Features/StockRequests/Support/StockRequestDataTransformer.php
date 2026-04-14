<?php

namespace App\Features\StockRequests\Support;

use App\Models\StockRequest;
use App\Models\StockRequestItem;
use App\Models\StockRequestStatusHistory;

class StockRequestDataTransformer
{
    public const RELATIONS = [
        'warehouse:id,name',
        'requestor:id,name,email',
        'items:id,stock_request_id,variant_id,quantity,reason',
        'items.variant:id,product_master_id,model_code,sku,condition,color,ram,rom,cpu,gpu,ram_type,rom_type,operating_system,screen',
        'items.variant.productMaster:id,model_id',
        'items.variant.productMaster.model:id,brand_id,model_name',
        'items.variant.productMaster.model.brand:id,name',
        'statusHistories:id,stock_request_id,status,actor_id,occurred_at,notes',
        'statusHistories.actor:id,name,email',
    ];

    public static function transform(StockRequest $request): array
    {
        $items = $request->items->map(fn (StockRequestItem $item) => self::transformItem($item))->values()->all();

        $approvalHistory = $request->statusHistories
            ->filter(fn (StockRequestStatusHistory $history) => $history->status !== 'pending')
            ->sortByDesc('occurred_at')
            ->first();

        return [
            'id' => $request->id,
            'request_number' => $request->request_number,
            'warehouse_id' => $request->warehouse_id,
            'branch_name' => $request->warehouse?->name,
            'requestor_id' => $request->requestor_id,
            'requested_by' => $request->requestor?->name ?? $request->requestor?->email,
            'required_at' => optional($request->required_at)?->toIso8601String(),
            'required_date' => optional($request->required_at)?->toIso8601String(),
            'purpose' => $request->purpose,
            'status' => $request->status,
            'notes' => $request->notes,
            'created_at' => optional($request->created_at)?->toIso8601String(),
            'updated_at' => optional($request->updated_at)?->toIso8601String(),
            'items' => $items,
            'total_items' => collect($items)->sum('quantity'),
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
                'approver_name' => $approvalHistory?->actor?->name ?? $approvalHistory?->actor?->email,
                'approval_date' => optional($approvalHistory?->occurred_at)?->toIso8601String(),
            ],
        ];
    }

    public static function transformItem(StockRequestItem $item): array
    {
        $variant = $item->variant;
        $master = $variant?->productMaster;
        $model = $master?->model;
        $attributes = $variant?->attributesMap() ?? [];

        return [
            'id' => $item->id,
            'variant_id' => $item->variant_id,
            'quantity' => $item->quantity,
            'reason' => $item->reason,
            'brand' => $model?->brand?->name,
            'model' => $model?->model_name,
            'variant_sku' => $variant?->sku,
            'variant_name' => $variant?->variant_name,
            'condition' => $variant?->condition ?? 'Brand New',
            'variant_attributes' => $attributes,
        ];
    }
}
