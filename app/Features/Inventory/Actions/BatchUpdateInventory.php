<?php

namespace App\Features\Inventory\Actions;

use App\Models\InventoryItem;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class BatchUpdateInventory
{
    public function __construct(
        private readonly LogInventoryActivity $logInventoryActivity,
    ) {}

    /**
     * @param  array<int, int>  $itemIds
     * @param  array<string, mixed>  $updateFields
     * @return array{
     *     succeeded: array<int, int>,
     *     failed: array<int, array{id: int, error: string}>,
     *     skippedConflicts: array<int, array{id: int, field: string, value: string}>
     * }
     */
    public function handle(array $itemIds, array $updateFields, ?int $actorId = null): array
    {
        $succeeded = [];
        $failed = [];
        $skippedConflicts = [];

        $items = InventoryItem::query()
            ->with('productVariant')
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id');

        $productMasterId = $this->resolveSharedProductMasterId($itemIds, $items);
        $basePayload = $this->buildPayload($updateFields, $productMasterId);

        foreach ($itemIds as $itemId) {
            $item = $items->get($itemId);

            if ($item === null) {
                $failed[] = ['id' => $itemId, 'error' => 'Inventory item not found.'];

                continue;
            }

            try {
                $itemPayload = $basePayload;

                if ($itemPayload !== []) {
                    $item->update($itemPayload);
                    $this->logInventoryActivity->handle(
                        $item->fresh(),
                        'BATCH_UPDATE',
                        $actorId,
                        'Inventory item updated through batch update.',
                        ['fields' => array_keys($itemPayload)],
                    );
                }

                $succeeded[] = $itemId;
            } catch (\Throwable $exception) {
                $failed[] = ['id' => $itemId, 'error' => $exception->getMessage()];
            }
        }

        return compact('succeeded', 'failed', 'skippedConflicts');
    }

    /**
     * @param  array<string, mixed>  $updateFields
     * @return array<string, mixed>
     */
    private function buildPayload(array $updateFields, int $productMasterId): array
    {
        $payload = [];

        foreach ($updateFields as $key => $value) {
            if ($this->shouldSkip($value)) {
                continue;
            }

            match ($key) {
                'variant_id' => $payload['product_variant_id'] = $this->resolveVariantId((int) $value, $productMasterId),
                'warehouse_id' => $payload['warehouse_id'] = (int) $value,
                'status' => $payload['status'] = trim((string) $value),
                'warranty_description' => $payload['warranty'] = trim((string) $value),
                default => null,
            };
        }

        return collect($payload)
            ->reject(fn ($value) => $value === null || $value === '')
            ->all();
    }

    private function shouldSkip(mixed $value): bool
    {
        return $value === null || $value === '';
    }

    /**
     * @param  array<int, int>  $itemIds
     * @param  Collection<int, InventoryItem>  $items
     */
    private function resolveSharedProductMasterId(array $itemIds, Collection $items): int
    {
        if ($items->count() !== count(array_unique($itemIds))) {
            throw new InvalidArgumentException('One or more selected inventory items could not be found.');
        }

        $productMasterIds = [];

        foreach ($itemIds as $itemId) {
            $item = $items->get($itemId);
            $productMasterId = $item?->productVariant?->product_master_id;

            if ($productMasterId === null) {
                throw new InvalidArgumentException('Batch update is only available for items linked to a product master.');
            }

            $productMasterIds[] = (int) $productMasterId;
        }

        $productMasterIds = array_values(array_unique($productMasterIds));

        if (count($productMasterIds) !== 1) {
            throw new InvalidArgumentException('Batch update requires all selected items to belong to the same product master.');
        }

        return $productMasterIds[0];
    }

    private function resolveVariantId(int $variantId, int $productMasterId): int
    {
        $variant = ProductVariant::query()
            ->whereKey($variantId)
            ->where('product_master_id', $productMasterId)
            ->first();

        if ($variant === null) {
            throw new InvalidArgumentException('Selected variant must belong to the same product master as the selected inventory items.');
        }

        return $variant->id;
    }
}
