<?php

namespace App\Features\Inventory\Actions;

use App\Models\InventoryItem;
use App\Models\ProductVariant;
use Illuminate\Support\Carbon;

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
        $excludeIdSet = collect($itemIds)->map(fn ($id) => (int) $id)->values()->all();

        $basePayload = $this->buildPayload($updateFields);

        $items = InventoryItem::query()
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id');

        foreach ($itemIds as $itemId) {
            $item = $items->get($itemId);

            if ($item === null) {
                $failed[] = ['id' => $itemId, 'error' => 'Inventory item not found.'];

                continue;
            }

            try {
                $itemPayload = $basePayload;

                foreach (['imei', 'imei2', 'serial_number'] as $field) {
                    $value = $itemPayload[$field] ?? null;

                    if (! is_string($value) || trim($value) === '') {
                        continue;
                    }

                    if ($this->hasConflict($field, $value, $excludeIdSet)) {
                        $skippedConflicts[] = [
                            'id' => $itemId,
                            'field' => $field === 'imei' ? 'imei1' : $field,
                            'value' => $value,
                        ];
                        unset($itemPayload[$field]);
                    }
                }

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
    private function buildPayload(array $updateFields): array
    {
        $payload = [];

        foreach ($updateFields as $key => $value) {
            if ($this->shouldSkip($value)) {
                continue;
            }

            match ($key) {
                'variant_id' => $payload['product_variant_id'] = ProductVariant::query()->findOrFail((int) $value)->id,
                'warehouse_id' => $payload['warehouse_id'] = (int) $value,
                'imei1' => $payload['imei'] = trim((string) $value),
                'imei2' => $payload['imei2'] = trim((string) $value),
                'serial_number' => $payload['serial_number'] = trim((string) $value),
                'status' => $payload['status'] = trim((string) $value),
                'encoded_date' => $payload['encoded_at'] = Carbon::parse((string) $value),
                'warranty_description' => $payload['warranty'] = trim((string) $value),
                'cost_price' => $payload['cost_price'] = $value,
                'cash_price' => $payload['cash_price'] = $value,
                'srp' => $payload['srp_price'] = $value,
                'package' => $payload['package'] = trim((string) $value),
                'cpu' => $payload['cpu'] = trim((string) $value),
                'gpu' => $payload['gpu'] = trim((string) $value),
                'submodel' => $payload['submodel'] = trim((string) $value),
                'ram_type' => $payload['ram_type'] = trim((string) $value),
                'rom_type' => $payload['rom_type'] = trim((string) $value),
                'ram_slots' => $payload['ram_slots'] = trim((string) $value),
                'product_type' => $payload['product_type'] = trim((string) $value),
                'country_model' => $payload['country_model'] = trim((string) $value),
                'with_charger' => $payload['with_charger'] = (bool) $value,
                'resolution' => $payload['resolution'] = trim((string) $value),
                'grn_number' => $payload['grn_number'] = trim((string) $value),
                'purchase' => $payload['purchase_reference'] = trim((string) $value),
                'purchase_file_data' => $payload['purchase_file_data'] = $this->cleanPurchaseFileData($value),
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
     * @param  mixed  $value
     * @return array<string, mixed>|null
     */
    private function cleanPurchaseFileData(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        $cleaned = collect($value)
            ->reject(fn ($subValue) => $subValue === null || $subValue === '')
            ->all();

        return $cleaned !== [] ? $cleaned : null;
    }

    /**
     * @param  array<int, int>  $excludeIds
     */
    private function hasConflict(string $field, string $value, array $excludeIds): bool
    {
        return InventoryItem::query()
            ->where($field, $value)
            ->whereNotIn('id', $excludeIds)
            ->exists();
    }
}
