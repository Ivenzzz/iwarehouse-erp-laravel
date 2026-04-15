<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\InventoryItem;

class ValidateGoodsReceiptDuplicates
{
    public function handle(array $items): array
    {
        $duplicates = [];

        foreach ($items as $index => $item) {
            $identifiers = data_get($item, 'identifiers', []);
            $checks = [
                'imei1' => data_get($identifiers, 'imei1'),
                'imei2' => data_get($identifiers, 'imei2'),
                'serial_number' => data_get($identifiers, 'serial_number'),
            ];

            foreach ($checks as $type => $value) {
                $value = trim((string) $value);
                if ($value === '') {
                    continue;
                }

                $existing = match ($type) {
                    'imei1' => InventoryItem::query()->where('imei', $value)->first(),
                    'imei2' => InventoryItem::query()->where('imei2', $value)->first(),
                    default => InventoryItem::query()->where('serial_number', $value)->first(),
                };

                if ($existing) {
                    $duplicates[] = [
                        'type' => $type,
                        'value' => $value,
                        'rowIndex' => $index + 1,
                        'existingGRN' => $existing->grn_number ?: 'Unknown',
                    ];
                }
            }
        }

        return $duplicates;
    }
}
