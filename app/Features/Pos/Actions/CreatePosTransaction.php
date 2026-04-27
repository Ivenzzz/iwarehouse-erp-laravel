<?php

namespace App\Features\Pos\Actions;

use App\Features\Inventory\Actions\LogInventoryActivity;
use App\Features\Pos\Support\PosDataTransformer;
use App\Models\InventoryItem;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionDocument;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionItemComponent;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\SalesTransactionPaymentDocument;
use Illuminate\Database\QueryException;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreatePosTransaction
{
    private const TRANSACTION_NUMBER_RETRY_LIMIT = 3;

    private const TRANSACTION_NUMBER_LOCK_WAIT_SECONDS = 5;

    private const TRANSACTION_NUMBER_LOCK_NAME = 'sales_transactions.transaction_number';

    private const TRANSACTION_NUMBER_CONFLICT_MESSAGE = 'Transaction number conflict. Please retry.';

    public function __construct(
        private readonly PosDataTransformer $transformer,
        private readonly LogInventoryActivity $logInventoryActivity,
    ) {}

    public function handle(array $payload, ?int $actorId = null): array
    {
        for ($attempt = 1; $attempt <= self::TRANSACTION_NUMBER_RETRY_LIMIT; $attempt++) {
            $connection = DB::connection();
            $lockAcquired = false;

            try {
                if ($this->usesMysqlAdvisoryLocks($connection)) {
                    $this->acquireTransactionNumberLock($connection);
                    $lockAcquired = true;
                }

                return $connection->transaction(function () use ($payload, $actorId) {
                    $lineInventoryIds = collect($payload['items'])
                        ->pluck('inventory_item_id')
                        ->map(fn ($value) => (int) $value)
                        ->all();
                    $bundleComponentIds = collect($payload['items'])
                        ->flatMap(fn ($item) => $item['bundle_components'] ?? [])
                        ->pluck('inventory_id')
                        ->filter(fn ($value) => filled($value))
                        ->map(fn ($value) => (int) $value)
                        ->all();
                    $allInventoryIds = collect([...$lineInventoryIds, ...$bundleComponentIds])
                        ->unique()
                        ->values()
                        ->all();

                    $inventoryItems = InventoryItem::query()
                        ->whereIn('id', $allInventoryIds)
                        ->lockForUpdate()
                        ->get()
                        ->keyBy('id');

                    foreach ($allInventoryIds as $inventoryId) {
                        $inventoryItem = $inventoryItems->get($inventoryId);

                        if ($inventoryItem === null) {
                            throw new InvalidArgumentException('One or more inventory items no longer exist.');
                        }

                        if ($inventoryItem->status !== 'available') {
                            throw new InvalidArgumentException('One or more inventory items are no longer available.');
                        }
                    }

                    $transaction = $this->createSalesTransactionRecord($payload, $this->nextTransactionNumberFromLatestRecord());
                    $transaction->loadMissing('customer');

                    $customerName = trim(implode(' ', array_filter([
                        (string) ($transaction->customer?->firstname ?? ''),
                        (string) ($transaction->customer?->lastname ?? ''),
                    ])));
                    $customerName = $customerName !== '' ? $customerName : null;
                    $transactionDate = optional($transaction->created_at)?->toDateTimeString();
                    $customerNotesSegment = $customerName !== null ? " for {$customerName}" : '';
                    $saleNotes = "Sold via POS transaction {$transaction->transaction_number} (OR {$transaction->or_number}) on {$transactionDate}{$customerNotesSegment}.";

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

                            $componentInventoryId = (int) $componentPayload['inventory_id'];
                            $componentItem = $inventoryItems->get($componentInventoryId);
                            if ($componentItem !== null && $componentItem->status !== 'sold') {
                                $componentItem->update(['status' => 'sold']);
                                $this->logInventoryActivity->handle(
                                    $componentItem->fresh(),
                                    'POS_SOLD',
                                    $actorId,
                                    $saleNotes,
                                    [
                                        'sales_transaction_id' => $transaction->id,
                                        'transaction_number' => $transaction->transaction_number,
                                        'or_number' => $transaction->or_number,
                                        'transaction_date' => $transactionDate,
                                        'customer_id' => $transaction->customer_id,
                                        'customer_name' => $customerName,
                                        'line_item_id' => $lineItem->id,
                                        'is_bundle_component' => true,
                                    ],
                                );
                            }
                        }

                        $lineInventoryId = (int) $itemPayload['inventory_item_id'];
                        $lineInventoryItem = $inventoryItems->get($lineInventoryId);
                        if ($lineInventoryItem !== null && $lineInventoryItem->status !== 'sold') {
                            $lineInventoryItem->update(['status' => 'sold']);
                            $this->logInventoryActivity->handle(
                                $lineInventoryItem->fresh(),
                                'POS_SOLD',
                                $actorId,
                                $saleNotes,
                                [
                                    'sales_transaction_id' => $transaction->id,
                                    'transaction_number' => $transaction->transaction_number,
                                    'or_number' => $transaction->or_number,
                                    'transaction_date' => $transactionDate,
                                    'customer_id' => $transaction->customer_id,
                                    'customer_name' => $customerName,
                                    'line_item_id' => $lineItem->id,
                                    'is_bundle_component' => false,
                                ],
                            );
                        }
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
            } catch (QueryException $exception) {
                if (! $this->isTransactionNumberUniqueConstraintViolation($exception)) {
                    throw $exception;
                }

                if ($attempt >= self::TRANSACTION_NUMBER_RETRY_LIMIT) {
                    throw new InvalidArgumentException(self::TRANSACTION_NUMBER_CONFLICT_MESSAGE, previous: $exception);
                }
            } finally {
                if ($lockAcquired) {
                    $this->releaseTransactionNumberLock($connection);
                }
            }
        }

        throw new InvalidArgumentException(self::TRANSACTION_NUMBER_CONFLICT_MESSAGE);
    }

    private function createSalesTransactionRecord(array $payload, string $transactionNumber): SalesTransaction
    {
        return SalesTransaction::create([
            'transaction_number' => $transactionNumber,
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
    }

    private function acquireTransactionNumberLock(ConnectionInterface $connection): void
    {
        $lockResult = $connection->selectOne(
            'SELECT GET_LOCK(?, ?) AS lock_acquired',
            [self::TRANSACTION_NUMBER_LOCK_NAME, self::TRANSACTION_NUMBER_LOCK_WAIT_SECONDS],
        );
        $acquired = (int) ($lockResult->lock_acquired ?? 0);

        if ($acquired !== 1) {
            throw new InvalidArgumentException(self::TRANSACTION_NUMBER_CONFLICT_MESSAGE);
        }
    }

    private function releaseTransactionNumberLock(ConnectionInterface $connection): void
    {
        try {
            $connection->selectOne('SELECT RELEASE_LOCK(?) AS lock_released', [self::TRANSACTION_NUMBER_LOCK_NAME]);
        } catch (\Throwable) {
            // Ignore release failures: lock is connection-scoped and will be dropped on connection close.
        }
    }

    private function usesMysqlAdvisoryLocks(ConnectionInterface $connection): bool
    {
        $driver = $connection->getDriverName();

        return $driver === 'mysql';
    }

    private function nextTransactionNumberFromLatestRecord(): string
    {
        $latestNumber = SalesTransaction::query()
            ->orderByDesc('id')
            ->value('transaction_number');

        if (! is_string($latestNumber) || ! preg_match('/(\d+)$/', $latestNumber, $matches)) {
            return '000001';
        }

        $current = $matches[1];
        $next = ((int) $current) + 1;
        $width = max(6, strlen($current));

        return str_pad((string) $next, $width, '0', STR_PAD_LEFT);
    }

    private function isTransactionNumberUniqueConstraintViolation(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'uq_sales_transactions_transaction_number')
            || str_contains($message, 'sales_transactions.transaction_number');
    }
}
