<?php

namespace App\Features\Pos\Actions;

use App\Features\Pos\Support\PosDataTransformer;
use App\Models\InventoryItem;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionDocument;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionItemComponent;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\SalesTransactionPaymentDocument;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreatePosTransaction
{
    public function __construct(private readonly PosDataTransformer $transformer)
    {
    }

    public function handle(array $payload): array
    {
        return DB::transaction(function () use ($payload) {
            $inventoryIds = collect($payload['items'])
                ->pluck('inventory_item_id')
                ->map(fn ($value) => (int) $value)
                ->all();

            $inventoryItems = InventoryItem::query()
                ->whereIn('id', $inventoryIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($payload['items'] as $itemPayload) {
                $inventoryItem = $inventoryItems->get((int) $itemPayload['inventory_item_id']);

                if ($inventoryItem === null) {
                    throw new InvalidArgumentException('One or more inventory items no longer exist.');
                }

                if ($inventoryItem->status !== 'available') {
                    throw new InvalidArgumentException('One or more inventory items are no longer available.');
                }
            }

            $transaction = SalesTransaction::create([
                'or_number' => $payload['or_number'],
                'customer_id' => (int) $payload['customer_id'],
                'pos_session_id' => (int) $payload['pos_session_id'],
                'sales_representative_id' => filled($payload['sales_representative_id'] ?? null)
                    ? (int) $payload['sales_representative_id']
                    : null,
                'mode_of_release' => $payload['mode_of_release'] ?? SalesTransaction::MODE_PICKUP,
                'remarks' => $payload['remarks'] ?? null,
                'total_amount' => (float) $payload['total_amount'],
            ]);

            foreach ($payload['items'] as $itemPayload) {
                $lineItem = SalesTransactionItem::create([
                    'sales_transaction_id' => $transaction->id,
                    'inventory_item_id' => (int) $itemPayload['inventory_item_id'],
                    'price_basis' => $itemPayload['price_basis'] ?? SalesTransactionItem::PRICE_BASIS_CASH,
                    'snapshot_cash_price' => $itemPayload['snapshot_cash_price'] ?? null,
                    'snapshot_srp' => $itemPayload['snapshot_srp'] ?? null,
                    'snapshot_cost_price' => $itemPayload['snapshot_cost_price'] ?? null,
                    'discount_amount' => $itemPayload['discount_amount'] ?? 0,
                    'discount_proof_image_url' => $itemPayload['discount_proof_image_url'] ?? null,
                    'discount_validated_at' => $itemPayload['discount_validated_at'] ?? null,
                    'line_total' => (float) $itemPayload['line_total'],
                    'is_bundle' => (bool) ($itemPayload['is_bundle'] ?? false),
                    'bundle_serial' => $itemPayload['bundle_serial'] ?? null,
                ]);

                foreach ($itemPayload['bundle_components'] ?? [] as $componentPayload) {
                    if (! filled($componentPayload['inventory_id'] ?? null)) {
                        continue;
                    }

                    SalesTransactionItemComponent::create([
                        'sales_transaction_item_id' => $lineItem->id,
                        'inventory_item_id' => (int) $componentPayload['inventory_id'],
                    ]);

                    InventoryItem::query()
                        ->whereKey((int) $componentPayload['inventory_id'])
                        ->update(['status' => 'sold']);
                }

                InventoryItem::query()
                    ->whereKey((int) $itemPayload['inventory_item_id'])
                    ->update(['status' => 'sold']);
            }

            foreach ($payload['payments'] as $paymentPayload) {
                $payment = SalesTransactionPayment::create([
                    'sales_transaction_id' => $transaction->id,
                    'payment_method_id' => (int) $paymentPayload['payment_method_id'],
                    'amount' => (float) $paymentPayload['amount'],
                ]);

                $details = $paymentPayload['payment_details'] ?? [];
                $hasDetails = collect([
                    $details['reference_number'] ?? null,
                    $details['downpayment'] ?? null,
                    $details['bank'] ?? null,
                    $details['terminal_used'] ?? null,
                    $details['card_holder_name'] ?? null,
                    $details['loan_term_months'] ?? null,
                    $details['sender_mobile'] ?? null,
                    $details['contract_id'] ?? null,
                    $details['registered_mobile'] ?? null,
                ])->filter(fn ($value) => $value !== null && $value !== '')->isNotEmpty()
                    || ! empty($details['supporting_doc_urls'] ?? []);

                if (! $hasDetails) {
                    continue;
                }

                $paymentDetail = SalesTransactionPaymentDetail::create([
                    'sales_transaction_payment_id' => $payment->id,
                    'is_cash' => $details['is_cash'] ?? null,
                    'reference_number' => $details['reference_number'] ?? null,
                    'downpayment' => $details['downpayment'] ?? null,
                    'bank' => $details['bank'] ?? null,
                    'terminal_used' => $details['terminal_used'] ?? null,
                    'card_holder_name' => $details['card_holder_name'] ?? null,
                    'loan_term_months' => $details['loan_term_months'] ?? null,
                    'sender_mobile' => $details['sender_mobile'] ?? null,
                    'contract_id' => $details['contract_id'] ?? null,
                    'registered_mobile' => $details['registered_mobile'] ?? null,
                ]);

                foreach ($details['supporting_doc_urls'] ?? [] as $document) {
                    SalesTransactionPaymentDocument::create([
                        'sales_transaction_payment_detail_id' => $paymentDetail->id,
                        'document_name' => $document['name'] ?? null,
                        'document_url' => $document['url'] ?? null,
                        'document_type' => $document['type'] ?? null,
                    ]);
                }
            }

            foreach ($payload['documents'] ?? [] as $documentPayload) {
                if (! filled($documentPayload['document_url'] ?? null)) {
                    continue;
                }

                SalesTransactionDocument::create([
                    'sales_transaction_id' => $transaction->id,
                    'document_type' => $documentPayload['document_type'],
                    'document_name' => $documentPayload['document_name'] ?? null,
                    'document_url' => $documentPayload['document_url'],
                ]);
            }

            return $this->transformer->transformTransaction($transaction->fresh());
        });
    }
}
