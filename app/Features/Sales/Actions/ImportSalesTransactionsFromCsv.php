<?php

namespace App\Features\Sales\Actions;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionDocument;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\SalesTransactionPaymentDocument;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class ImportSalesTransactionsFromCsv
{
    private const OUTCOME_HARD_ERROR = 'hard_error';

    private const OUTCOME_SOFT_SKIP_DISCONNECTED = 'soft_skip_disconnected';

    private const REQUIRED_HEADERS = [
        'transaction_number',
        'or_number',
        'mode_of_release',
        'remarks',
        'transaction_date',
        'customer_name',
        'warehouse_name',
        'pos_session_number',
        'sales_representative_name',
        'inventory_identifier',
        'unit_price',
        'price_basis',
        'snapshot_cash_price',
        'snapshot_srp',
        'snapshot_cost_price',
        'discount_amount',
        'proof_image_url',
        'validated_at',
        'line_total',
        'is_bundle',
        'bundle_serial',
        'payment_method_name',
        'amount',
        'reference_number',
        'downpayment',
        'bank',
        'terminal_used',
        'card_holder_name',
        'loan_term_months',
        'sender_mobile',
        'contract_id',
        'registered_mobile',
        'supporting_doc_url',
        'supporting_doc_name',
        'supporting_doc_type',
        'official_receipt_url',
        'customer_id_url',
        'customer_agreement_url',
        'other_supporting_documents',
    ];

    private const MAX_ERROR_ROWS = 10;

    public function handle(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'The CSV file could not be opened.']);
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'The CSV file is empty.']);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => $this->normalizeHeader((string) $header))
            ->values();
        $headerMap = $normalizedHeaders->flip();

        $missing = collect(self::REQUIRED_HEADERS)->reject(fn (string $header) => $headerMap->has($header))->values();
        if ($missing->isNotEmpty()) {
            fclose($handle);
            throw ValidationException::withMessages([
                'file' => 'Missing required headers: '.$missing->implode(', '),
            ]);
        }

        $groups = [];
        $rowNumber = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if ($this->isBlankRow($row)) {
                continue;
            }

            $payload = ['_row_number' => $rowNumber];
            foreach (self::REQUIRED_HEADERS as $header) {
                $payload[$header] = trim((string) ($row[(int) $headerMap[$header]] ?? ''));
            }

            $groupKey = $payload['transaction_number'].'|'.$payload['or_number'];
            $groups[$groupKey][] = $payload;
        }
        fclose($handle);

        $lookups = $this->buildLookups();
        $summary = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'error_rows' => [],
        ];

        foreach ($groups as $rows) {
            $this->importGroup($rows, $lookups, $summary);
        }

        $summary['message'] = sprintf(
            'Sales transactions import complete: %d created, %d skipped, %d error(s).',
            $summary['created'],
            $summary['skipped'],
            $summary['errors'],
        );

        return $summary;
    }

    private function importGroup(array $rows, array $lookups, array &$summary): void
    {
        $first = $rows[0];
        $rowLabel = 'Row '.$first['_row_number'];

        $groupIssue = $this->validateGroup($first, $lookups);
        if ($groupIssue !== null) {
            if ($groupIssue['outcome'] === self::OUTCOME_HARD_ERROR) {
                $this->recordError($summary, "{$rowLabel}: {$groupIssue['message']}");
            }
            $summary['skipped'] += count($rows);

            return;
        }

        if (SalesTransaction::query()
            ->where('transaction_number', $first['transaction_number'])
            ->orWhere('or_number', $first['or_number'])
            ->exists()) {
            $summary['skipped'] += count($rows);

            return;
        }

        $validRows = [];
        $seenInventory = [];
        $itemRows = [];
        $payments = [];

        foreach ($rows as $row) {
            $rowIssue = $this->validateRow($row, $lookups);
            if ($rowIssue !== null) {
                if ($rowIssue['outcome'] === self::OUTCOME_HARD_ERROR) {
                    $this->recordError($summary, 'Row '.$row['_row_number'].': '.$rowIssue['message']);
                }
                $summary['skipped']++;

                continue;
            }

            $validRows[] = $row;
            $identifierKey = $this->key($row['inventory_identifier']);
            if (! isset($seenInventory[$identifierKey])) {
                $seenInventory[$identifierKey] = true;
                $itemRows[] = $row;
            }

            if ($row['payment_method_name'] !== '' && $row['amount'] !== '') {
                $payments[] = $row;
            }
        }

        if ($validRows === []) {
            return;
        }

        if ($itemRows === [] || $payments === []) {
            $this->recordError($summary, "{$rowLabel}: transaction has no valid item/payment rows.");
            $summary['skipped'] += count($validRows);

            return;
        }

        try {
            DB::transaction(function () use ($first, $validRows, $itemRows, $payments, $lookups, &$summary): void {
                $transactionDate = Carbon::parse($first['transaction_date']);
                $totalAmount = collect($payments)->sum(fn (array $row) => (float) $row['amount']);

                $transaction = SalesTransaction::create([
                    'transaction_number' => $first['transaction_number'],
                    'or_number' => $first['or_number'],
                    'customer_id' => $lookups['customers'][$this->key($first['customer_name'])],
                    'pos_session_id' => $lookups['sessions'][$this->key($first['pos_session_number'])],
                    'sales_representative_id' => $lookups['employees'][$this->key($first['sales_representative_name'])],
                    'mode_of_release' => $first['mode_of_release'],
                    'remarks' => $first['remarks'] !== '' ? $first['remarks'] : null,
                    'total_amount' => round((float) $totalAmount, 2),
                ]);

                $transaction->timestamps = false;
                $transaction->forceFill([
                    'created_at' => $transactionDate,
                    'updated_at' => $transactionDate,
                ])->saveQuietly();

                foreach ($itemRows as $row) {
                    $inventoryId = $lookups['inventory'][$this->key($row['inventory_identifier'])];

                    SalesTransactionItem::create([
                        'sales_transaction_id' => $transaction->id,
                        'inventory_item_id' => $inventoryId,
                        'price_basis' => Str::lower($row['price_basis']),
                        'snapshot_cash_price' => $this->nullableFloat($row['snapshot_cash_price']),
                        'snapshot_srp' => $this->nullableFloat($row['snapshot_srp']),
                        'snapshot_cost_price' => $this->nullableFloat($row['snapshot_cost_price']),
                        'discount_amount' => $this->nullableFloat($row['discount_amount']) ?? 0,
                        'discount_proof_image_url' => $row['proof_image_url'] !== '' ? $row['proof_image_url'] : null,
                        'discount_validated_at' => $row['validated_at'] !== '' ? Carbon::parse($row['validated_at']) : null,
                        'line_total' => (float) $row['line_total'],
                        'is_bundle' => $this->toBool($row['is_bundle']),
                        'bundle_serial' => $row['bundle_serial'] !== '' ? $row['bundle_serial'] : null,
                    ]);
                }

                foreach ($payments as $row) {
                    $payment = SalesTransactionPayment::create([
                        'sales_transaction_id' => $transaction->id,
                        'payment_method_id' => $lookups['paymentMethods'][$this->key($row['payment_method_name'])],
                        'amount' => (float) $row['amount'],
                    ]);

                    if ($this->hasPaymentDetails($row)) {
                        $detail = SalesTransactionPaymentDetail::create([
                            'sales_transaction_payment_id' => $payment->id,
                            'reference_number' => $row['reference_number'] !== '' ? $row['reference_number'] : null,
                            'downpayment' => $row['downpayment'] !== '' ? $row['downpayment'] : null,
                            'bank' => $row['bank'] !== '' ? $row['bank'] : null,
                            'terminal_used' => $row['terminal_used'] !== '' ? $row['terminal_used'] : null,
                            'card_holder_name' => $row['card_holder_name'] !== '' ? $row['card_holder_name'] : null,
                            'loan_term_months' => $row['loan_term_months'] !== '' ? (int) $row['loan_term_months'] : null,
                            'sender_mobile' => $row['sender_mobile'] !== '' ? $row['sender_mobile'] : null,
                            'contract_id' => $row['contract_id'] !== '' ? $row['contract_id'] : null,
                            'registered_mobile' => $row['registered_mobile'] !== '' ? $row['registered_mobile'] : null,
                        ]);

                        if ($row['supporting_doc_url'] !== '') {
                            SalesTransactionPaymentDocument::create([
                                'sales_transaction_payment_detail_id' => $detail->id,
                                'document_name' => $row['supporting_doc_name'] !== '' ? $row['supporting_doc_name'] : null,
                                'document_url' => $row['supporting_doc_url'],
                                'document_type' => $row['supporting_doc_type'] !== '' ? $row['supporting_doc_type'] : null,
                            ]);
                        }
                    }
                }

                $this->createTransactionDocuments($transaction, $validRows);
                InventoryItem::query()
                    ->whereIn('id', collect($itemRows)->map(fn (array $row) => $lookups['inventory'][$this->key($row['inventory_identifier'])])->all())
                    ->update(['status' => 'sold']);

                $summary['created']++;
            });
        } catch (Throwable $e) {
            $this->recordError($summary, "{$rowLabel}: ".$e->getMessage());
            $summary['skipped'] += count($rows);
        }
    }

    /** @return array{outcome:string,message:string}|null */
    private function validateGroup(array $row, array $lookups): ?array
    {
        foreach (['transaction_number', 'or_number', 'transaction_date', 'customer_name', 'warehouse_name', 'pos_session_number', 'sales_representative_name', 'mode_of_release'] as $field) {
            if ($row[$field] === '') {
                return $this->hardError("{$field} is required.");
            }
        }

        if (! $this->isValidDateTime($row['transaction_date'])) {
            return $this->hardError('transaction_date is not a valid datetime.');
        }

        if (! in_array($row['mode_of_release'], [SalesTransaction::MODE_PICKUP, SalesTransaction::MODE_DELIVERY], true)) {
            return $this->hardError('mode_of_release is invalid.');
        }

        if (! isset($lookups['customers'][$this->key($row['customer_name'])])) {
            return $this->softSkip("customer_name '{$row['customer_name']}' not found.");
        }

        if (! isset($lookups['warehouses'][$this->key($row['warehouse_name'])])) {
            return $this->softSkip("warehouse_name '{$row['warehouse_name']}' not found.");
        }

        if (! isset($lookups['sessions'][$this->key($row['pos_session_number'])])) {
            return $this->softSkip("pos_session_number '{$row['pos_session_number']}' not found.");
        }

        if (! isset($lookups['employees'][$this->key($row['sales_representative_name'])])) {
            return $this->softSkip("sales_representative_name '{$row['sales_representative_name']}' not found.");
        }

        return null;
    }

    /** @return array{outcome:string,message:string}|null */
    private function validateRow(array $row, array $lookups): ?array
    {
        if ($row['inventory_identifier'] === '') {
            return $this->hardError('inventory_identifier is required.');
        }

        if (! isset($lookups['inventory'][$this->key($row['inventory_identifier'])])) {
            return $this->softSkip("inventory_identifier '{$row['inventory_identifier']}' not found.");
        }

        if ($row['payment_method_name'] === '') {
            return $this->hardError('payment_method_name is required.');
        }

        if (! isset($lookups['paymentMethods'][$this->key($row['payment_method_name'])])) {
            return $this->softSkip("payment_method_name '{$row['payment_method_name']}' not found.");
        }

        foreach (['unit_price', 'snapshot_cash_price', 'snapshot_srp', 'snapshot_cost_price', 'discount_amount', 'line_total', 'amount', 'downpayment'] as $field) {
            if ($row[$field] !== '' && ! is_numeric($row[$field])) {
                return $this->hardError("{$field} must be numeric.");
            }
        }

        if ($row['line_total'] === '' || ! is_numeric($row['line_total'])) {
            return $this->hardError('line_total must be numeric.');
        }

        if ($row['amount'] === '' || ! is_numeric($row['amount'])) {
            return $this->hardError('amount must be numeric.');
        }

        if (! in_array(Str::lower($row['price_basis']), [SalesTransactionItem::PRICE_BASIS_CASH, SalesTransactionItem::PRICE_BASIS_SRP], true)) {
            return $this->hardError('price_basis must be cash or srp.');
        }

        foreach (['validated_at'] as $field) {
            if ($row[$field] !== '' && ! $this->isValidDateTime($row[$field])) {
                return $this->hardError("{$field} is not a valid datetime.");
            }
        }

        if ($row['loan_term_months'] !== '' && (! ctype_digit($row['loan_term_months']) || (int) $row['loan_term_months'] < 0)) {
            return $this->hardError('loan_term_months must be a whole number.');
        }

        return null;
    }

    private function buildLookups(): array
    {
        return [
            'customers' => Customer::query()
                ->get(['id', 'customer_kind', 'firstname', 'lastname', 'organization_name', 'legal_name'])
                ->mapWithKeys(fn (Customer $customer) => [$this->key($this->customerName($customer)) => $customer->id])
                ->all(),
            'warehouses' => Warehouse::query()
                ->pluck('id', 'name')
                ->mapWithKeys(fn ($id, $name) => [$this->key((string) $name) => $id])
                ->all(),
            'sessions' => PosSession::query()
                ->whereNotNull('session_number')
                ->pluck('id', 'session_number')
                ->mapWithKeys(fn ($id, $number) => [$this->key((string) $number) => $id])
                ->all(),
            'employees' => Employee::query()
                ->get(['id', 'first_name', 'middle_name', 'last_name'])
                ->mapWithKeys(fn (Employee $employee) => [$this->key($this->employeeName($employee)) => $employee->id])
                ->all(),
            'paymentMethods' => PaymentMethod::query()
                ->pluck('id', 'name')
                ->mapWithKeys(fn ($id, $name) => [$this->key((string) $name) => $id])
                ->all(),
            'inventory' => $this->inventoryLookup(),
        ];
    }

    private function inventoryLookup(): array
    {
        $lookup = [];
        InventoryItem::query()
            ->get(['id', 'imei', 'imei2', 'serial_number', 'grn_number'])
            ->each(function (InventoryItem $item) use (&$lookup): void {
                foreach ([$item->imei, $item->imei2, $item->serial_number, $item->grn_number] as $identifier) {
                    $key = $this->key((string) $identifier);
                    if ($key !== '') {
                        $lookup[$key] ??= $item->id;
                    }
                }
            });

        return $lookup;
    }

    private function createTransactionDocuments(SalesTransaction $transaction, array $rows): void
    {
        $documentColumns = [
            'official_receipt_url' => 'official_receipt',
            'customer_id_url' => 'customer_id',
            'customer_agreement_url' => 'customer_agreement',
            'other_supporting_documents' => 'other_supporting_documents',
        ];
        $seen = [];

        foreach ($rows as $row) {
            foreach ($documentColumns as $column => $type) {
                if ($row[$column] === '') {
                    continue;
                }

                $key = $type.'|'.$row[$column];
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;

                SalesTransactionDocument::create([
                    'sales_transaction_id' => $transaction->id,
                    'document_type' => $type,
                    'document_name' => $type,
                    'document_url' => $row[$column],
                ]);
            }
        }
    }

    private function hasPaymentDetails(array $row): bool
    {
        return collect([
            'reference_number',
            'downpayment',
            'bank',
            'terminal_used',
            'card_holder_name',
            'loan_term_months',
            'sender_mobile',
            'contract_id',
            'registered_mobile',
            'supporting_doc_url',
        ])->contains(fn (string $field) => $row[$field] !== '');
    }

    private function recordError(array &$summary, string $message): void
    {
        $summary['errors']++;
        if (count($summary['error_rows']) < self::MAX_ERROR_ROWS) {
            $summary['error_rows'][] = $message;
        }
    }

    /** @return array{outcome:string,message:string} */
    private function hardError(string $message): array
    {
        return [
            'outcome' => self::OUTCOME_HARD_ERROR,
            'message' => $message,
        ];
    }

    /** @return array{outcome:string,message:string} */
    private function softSkip(string $message): array
    {
        return [
            'outcome' => self::OUTCOME_SOFT_SKIP_DISCONNECTED,
            'message' => $message,
        ];
    }

    private function nullableFloat(string $value): ?float
    {
        return $value !== '' ? round((float) $value, 2) : null;
    }

    private function toBool(string $value): bool
    {
        return in_array(Str::lower($value), ['1', 'true', 'yes', 'y'], true);
    }

    private function isBlankRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function isValidDateTime(string $value): bool
    {
        try {
            Carbon::parse($value);

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function customerName(Customer $customer): string
    {
        if ($customer->customer_kind === Customer::KIND_ORGANIZATION) {
            return (string) ($customer->organization_name ?: $customer->legal_name);
        }

        return trim((string) $customer->firstname.' '.(string) $customer->lastname);
    }

    private function employeeName(Employee $employee): string
    {
        return trim(implode(' ', array_filter([
            $employee->first_name,
            $employee->middle_name,
            $employee->last_name,
        ])));
    }

    private function key(string $value): string
    {
        return Str::of($value)->squish()->lower()->value();
    }

    private function normalizeHeader(string $header): string
    {
        $clean = preg_replace('/^\xEF\xBB\xBF/u', '', $header) ?? $header;

        return Str::of($clean)->trim()->lower()->value();
    }
}
