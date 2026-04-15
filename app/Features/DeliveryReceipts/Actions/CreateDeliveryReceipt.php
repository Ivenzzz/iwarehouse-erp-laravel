<?php

namespace App\Features\DeliveryReceipts\Actions;

use App\Models\DeliveryReceipt;
use App\Models\PurchaseOrder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class CreateDeliveryReceipt
{
    private function storeUpload(?UploadedFile $file, string $directory): ?string
    {
        if (! $file instanceof UploadedFile) {
            return null;
        }

        return $file->store($directory, 'public');
    }

    public function handle(array $payload, ?int $userId = null): DeliveryReceipt
    {
        return DB::transaction(function () use ($payload, $userId) {
            $declaredItems = $payload['declared_items'] ?? [];
            $computedDrValue = collect($declaredItems)->sum(function (array $item) {
                $qty = (int) ($item['actual_quantity'] ?? 0);
                $unitCost = (float) ($item['unit_cost'] ?? 0);
                return $qty * $unitCost;
            });
            $freightCost = (float) data_get($payload, 'logistics.freight_cost', 0);
            $hasVariance = collect($declaredItems)->contains(function (array $item) {
                return (int) ($item['expected_quantity'] ?? $item['declared_quantity'] ?? 0) !== (int) ($item['actual_quantity'] ?? 0);
            });

            $dr = DeliveryReceipt::query()->create([
                'supplier_id' => (int) $payload['supplier_id'],
                'po_id' => $payload['po_id'] ? (int) $payload['po_id'] : null,
                'dr_number' => (string) $payload['dr_number'],
                'reference_number' => $payload['reference_number'] ?? null,
                'date_received' => $payload['date_received'],
                'date_encoded' => now(),
                'received_by_user_id' => $userId,
                'encoded_by_user_id' => $userId,
                'payment_term_id' => $payload['payment_term_id'] ?? null,
                'box_count_declared' => data_get($payload, 'summary.box_count_declared'),
                'box_count_received' => data_get($payload, 'summary.box_count_received'),
                'has_variance' => $hasVariance,
                'variance_notes' => data_get($payload, 'summary.variance_notes'),
                'dr_value' => $computedDrValue,
                'total_landed_cost' => $computedDrValue + $freightCost,
                'has_goods_receipt' => false,
            ]);

            $dr->logistics()->create([
                'logistics_company' => data_get($payload, 'logistics.logistics_company'),
                'waybill_number' => data_get($payload, 'logistics.waybill_number'),
                'driver_name' => data_get($payload, 'logistics.driver_name'),
                'driver_contact' => data_get($payload, 'logistics.driver_contact'),
                'origin' => data_get($payload, 'logistics.origin'),
                'destination' => data_get($payload, 'logistics.destination'),
                'freight_cost' => $freightCost,
            ]);

            $uploadDirectory = sprintf('delivery-receipts/%d', (int) $dr->id);

            $upload = $dr->upload()->create([
                'vendor_dr_url' => $this->storeUpload(data_get($payload, 'uploads.vendor_dr_file'), $uploadDirectory),
                'waybill_url' => $this->storeUpload(data_get($payload, 'uploads.waybill_file'), $uploadDirectory),
                'freight_invoice_url' => $this->storeUpload(data_get($payload, 'uploads.freight_invoice_file'), $uploadDirectory),
                'driver_id_url' => $this->storeUpload(data_get($payload, 'uploads.driver_id_file'), $uploadDirectory),
                'purchase_file_url' => data_get($payload, 'uploads.purchase_file_url'),
                'uploads_complete' => (bool) data_get($payload, 'uploads.uploads_complete', false),
            ]);

            foreach ((array) data_get($payload, 'uploads.box_photos', []) as $photoFile) {
                if (! $photoFile instanceof UploadedFile) {
                    continue;
                }

                $photoPath = $photoFile->store($uploadDirectory, 'public');
                $upload->boxPhotos()->create([
                    'photo_url' => $photoPath,
                ]);
            }

            foreach ($declaredItems as $item) {
                $expectedQuantity = (int) ($item['expected_quantity'] ?? $item['declared_quantity'] ?? 0);
                $actualQuantity = (int) ($item['actual_quantity'] ?? 0);
                $unitCost = (float) ($item['unit_cost'] ?? 0);
                $drItem = $dr->items()->create([
                    'product_master_id' => (int) $item['product_master_id'],
                    'expected_quantity' => $expectedQuantity,
                    'actual_quantity' => $actualQuantity,
                    'unit_cost' => $unitCost,
                    'cash_price' => $item['cash_price'] ?? null,
                    'srp_price' => $item['srp_price'] ?? null,
                    'total_value' => $actualQuantity * $unitCost,
                    'variance_flag' => $expectedQuantity !== $actualQuantity,
                    'variance_notes' => $item['variance_notes'] ?? null,
                ]);

                $drItem->spec()->create([
                    'model_code' => data_get($item, 'product_spec.model_code'),
                    'ram' => data_get($item, 'product_spec.ram'),
                    'rom' => data_get($item, 'product_spec.rom'),
                    'condition' => data_get($item, 'product_spec.condition'),
                ]);
            }

            if (!empty($payload['po_id'])) {
                PurchaseOrder::query()->whereKey((int) $payload['po_id'])->update(['has_delivery_receipt' => true]);
            }

            return $dr;
        });
    }
}
