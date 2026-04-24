<?php

namespace App\Features\ThreeWayMatching\Actions;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderPayable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MarkPurchaseOrderPaid
{
    public function handle(PurchaseOrder $purchaseOrder, int $actorId, UploadedFile $invoiceFile, ?string $notes): void
    {
        $path = $invoiceFile->store('three-way-matching/payables', 'public');
        $documentUrl = Storage::disk('public')->url($path);

        DB::transaction(function () use ($purchaseOrder, $actorId, $notes, $documentUrl, $invoiceFile): void {
            /** @var PurchaseOrderPayable $payable */
            $payable = $purchaseOrder->payable()->firstOrCreate(
                ['purchase_order_id' => $purchaseOrder->id],
                ['has_paid' => false]
            );

            $payable->update([
                'has_paid' => true,
                'paid_by_id' => $actorId,
                'paid_at' => now(),
                'notes' => $notes,
            ]);

            $payable->documents()->create([
                'document_url' => $documentUrl,
                'document_name' => $invoiceFile->getClientOriginalName(),
            ]);
        });
    }
}
