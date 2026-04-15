<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\ProductMaster;
use App\Models\ProductVariant;

class ValidatePurchaseCsv
{
    public function handle(string $csvText): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csvText));
        if (! is_array($lines) || count($lines) < 2) {
            return [
                'validatedRows' => [],
                'errors' => [['message' => 'CSV must include at least one data row.']],
                'brandConflicts' => [],
            ];
        }

        $header = str_getcsv((string) $lines[0]);
        $headerMap = collect($header)->mapWithKeys(fn ($name, $index) => [trim((string) $name) => $index]);

        $validatedRows = [];
        $errors = [];

        for ($i = 1; $i < count($lines); $i++) {
            $rowValues = str_getcsv((string) $lines[$i]);
            if (count(array_filter($rowValues, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $row = [];
            foreach ($headerMap as $name => $index) {
                $row[$name] = trim((string) ($rowValues[$index] ?? ''));
            }

            $model = strtolower((string) ($row['Model'] ?? ''));
            $condition = (string) ($row['Condition'] ?? 'Brand New');
            $ram = (string) ($row['Ram Capacity'] ?? '');
            $rom = (string) ($row['Rom Capacity'] ?? '');

            $master = ProductMaster::query()->with('model.brand')->get()->first(function (ProductMaster $pm) use ($model) {
                return str_contains(strtolower((string) $pm->product_name), $model);
            });

            if (! $master) {
                $errors[] = ['row' => $i + 1, 'message' => 'Product master not found for '.$row['Model']];
                continue;
            }

            $variant = ProductVariant::query()
                ->where('product_master_id', $master->id)
                ->where('condition', $condition)
                ->when($ram !== '', fn ($query) => $query->where('ram', $ram))
                ->when($rom !== '', fn ($query) => $query->where('rom', $rom))
                ->first();

            if (! $variant) {
                $errors[] = ['row' => $i + 1, 'message' => 'Variant not found for '.$row['Model']];
                continue;
            }

            $validatedRows[] = [
                'rowIndex' => $i + 1,
                'product_master_id' => $master->id,
                'variant_id' => $variant->id,
                'condition' => $variant->condition,
                'model_code' => $row['Model Code'] ?? null,
                'serial_number' => $row['Serial Number'] ?? null,
                'imei1' => $row['IMEI 1'] ?? ($row['Barcode'] ?? null),
                'imei2' => $row['IMEI 2'] ?? null,
                'ram_capacity' => $row['Ram Capacity'] ?? null,
                'rom_capacity' => $row['Rom Capacity'] ?? null,
                'submodel' => $row['Submodel'] ?? null,
                'ram_type' => $row['Ram Type'] ?? null,
                'rom_type' => $row['Rom Type'] ?? null,
                'ram_slots' => $row['Ram Slots'] ?? null,
                'product_type' => $row['Product Type'] ?? null,
                'with_charger' => $row['With Charger'] ?? null,
                'package' => $row['Package'] ?? null,
                'country_model' => $row['Country Model'] ?? null,
                'cpu' => $row['CPU'] ?? null,
                'gpu' => $row['GPU'] ?? null,
                'resolution' => $row['Resolution'] ?? null,
                'warranty' => $row['Warranty'] ?? null,
                'cost_price' => (float) preg_replace('/[^\d.\-]/', '', (string) ($row['Cost'] ?? 0)),
                'cash_price' => (float) preg_replace('/[^\d.\-]/', '', (string) ($row['Cash Price'] ?? 0)),
                'srp' => (float) preg_replace('/[^\d.\-]/', '', (string) ($row['SRP'] ?? 0)),
                'details' => $row['Details'] ?? null,
            ];
        }

        return [
            'validatedRows' => $validatedRows,
            'errors' => $errors,
            'brandConflicts' => [],
        ];
    }
}
