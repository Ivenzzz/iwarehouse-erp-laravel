<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Models\ProductMaster;
use App\Models\ProductVariant;

class ResolvePurchaseBrandConflicts
{
    public function __construct(
        private readonly MatchOrCreatePurchaseVariant $matchOrCreatePurchaseVariant,
    ) {}

    public function handle(array $brandConflicts): array
    {
        $masters = ProductMaster::query()->with(['model.brand'])->get()->keyBy('id');
        $resolved = [];
        $errors = [];

        foreach ($brandConflicts as $conflict) {
            $row = (array) ($conflict['row'] ?? []);
            $selectedBrandId = (string) ($conflict['selectedBrandId'] ?? '');
            $modelName = trim((string) ($conflict['modelName'] ?? ($row['Model'] ?? '')));

            if ($selectedBrandId === '') {
                $errors[] = ['message' => "Missing selected brand for model {$modelName}."];

                continue;
            }

            $candidateMasterIds = collect($conflict['brands'] ?? [])
                ->filter(fn ($brand) => (string) ($brand['brandId'] ?? '') === $selectedBrandId)
                ->pluck('productMasterId')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values();

            if ($candidateMasterIds->isEmpty()) {
                $errors[] = ['message' => "Selected brand for model {$modelName} has no matching product master."];

                continue;
            }

            /** @var ProductMaster|null $master */
            $master = $masters->get($candidateMasterIds->first());
            if (! $master) {
                $errors[] = ['message' => "Product master not found for model {$modelName}."];

                continue;
            }

            $rowNumber = ((int) ($conflict['rowIndex'] ?? 0)) + 2;
            if (! $this->rowHasAtLeastOneIdentifier($row)) {
                $errors[] = ['message' => "Row {$rowNumber}: Provide at least one of Serial Number, IMEI 1, IMEI 2, or Barcode (Barcode used when IMEI 1 is empty)."];

                continue;
            }

            $variant = $this->matchOrCreatePurchaseVariant->handle($row, $master);
            if (! $variant) {
                $errors[] = ['message' => "Variant not found for selected brand on model {$modelName}."];

                continue;
            }

            $resolved[] = $this->buildValidatedRow($row, $rowNumber, $master, $variant);
        }

        return [
            'resolved' => $resolved,
            'errors' => $errors,
        ];
    }

    private function rowHasAtLeastOneIdentifier(array $row): bool
    {
        $serial = trim((string) ($row['Serial Number'] ?? ''));
        $imei1Direct = trim((string) ($row['IMEI 1'] ?? ''));
        $barcode = trim((string) ($row['Barcode'] ?? ''));
        $imei1 = $imei1Direct !== '' ? $imei1Direct : $barcode;
        $imei2 = trim((string) ($row['IMEI 2'] ?? ''));

        return $serial !== '' || $imei1 !== '' || $imei2 !== '';
    }

    private function buildValidatedRow(array $row, int $rowNumber, ProductMaster $master, ProductVariant $variant): array
    {
        return [
            'rowIndex' => $rowNumber,
            'row' => $row,
            'product_master_id' => $master->id,
            'productMasterName' => $master->product_name,
            'product_name' => $master->product_name,
            'variant_id' => $variant->id,
            'variant_name' => $variant->variant_name,
            'condition' => $this->normalizeCondition((string) ($variant->condition ?: ($row['Condition'] ?? ''))),
            'model_code' => $row['Model Code'] ?? null,
            'serial_number' => $row['Serial Number'] ?? null,
            'imei1' => $row['IMEI 1'] ?: ($row['Barcode'] ?? null),
            'imei2' => $row['IMEI 2'] ?? null,
            'ram_capacity' => $this->normalizeCapacity((string) ($row['Ram Capacity'] ?? '')),
            'rom_capacity' => $this->normalizeCapacity((string) ($row['Rom Capacity'] ?? '')),
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
            'os' => $row['OS'] ?? null,
            'software' => $row['Software'] ?? null,
            'resolution' => $row['Resolution'] ?? null,
            'warranty' => $row['Warranty'] ?? null,
            'cost_price' => $this->parseNumber($row['Cost'] ?? 0),
            'cash_price' => $this->parseNumber($row['Cash Price'] ?? 0),
            'srp' => $this->parseNumber($row['SRP'] ?? 0),
            'details' => $row['Details'] ?? null,
        ];
    }

    private function sanitize(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower(trim($value))) ?: '';
    }

    private function normalizeCapacity(string $raw): string
    {
        $cleaned = $this->sanitize($raw);
        if ($cleaned === '') {
            return '';
        }
        if (preg_match('/^\d+$/', $cleaned) === 1) {
            $n = (int) $cleaned;

            return $n === 1024 ? '1TB' : "{$n}GB";
        }
        if (preg_match('/^(\d+)(tb|gb)$/', $cleaned, $matches) === 1) {
            $n = (int) $matches[1];
            $unit = strtoupper($matches[2]);
            if ($unit === 'GB' && $n === 1024) {
                return '1TB';
            }

            return "{$n}{$unit}";
        }

        return strtoupper(trim($raw));
    }

    private function normalizeCondition(string $value): string
    {
        $normalized = $this->sanitize($value);
        if (in_array($normalized, ['certifiedpreowned', 'preowned', 'cpo'], true)) {
            return 'Certified Pre-Owned';
        }
        if ($normalized === 'refurbished') {
            return 'Refurbished';
        }

        return 'Brand New';
    }

    private function parseNumber(mixed $value): float
    {
        $clean = preg_replace('/[^\d.\-]/', '', (string) $value);

        return is_numeric($clean) ? (float) $clean : 0.0;
    }
}
