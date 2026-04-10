<?php

namespace App\Features\SalesReports\Support;

use App\Features\Pos\Support\PosDataTransformer;
use App\Models\SalesTransaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SalesReportLedgerBuilder
{
    public function __construct(
        private readonly PosDataTransformer $posDataTransformer,
    ) {
    }

    public function transformTransactions(iterable $transactions): Collection
    {
        return collect($transactions)
            ->map(fn (SalesTransaction $transaction) => $this->posDataTransformer->transformTransaction($transaction))
            ->values();
    }

    public function sessionRows(Collection $transactions): array
    {
        return $transactions
            ->map(function (array $transaction): array {
                $products = collect($transaction['items'] ?? [])
                    ->map(function (array $item): array {
                        $name = trim((string) ($item['display_name'] ?? $item['variant_name'] ?? $item['product_name'] ?? ''));

                        return ['name' => $name !== '' ? $name : 'Item'];
                    })
                    ->values()
                    ->all();

                $paymentMethods = collect($transaction['payments_json']['payments'] ?? [])
                    ->map(fn (array $payment) => [
                        'payment_method' => $payment['payment_method'] ?? 'Unknown',
                        'amount' => (float) ($payment['amount'] ?? 0),
                    ])
                    ->values()
                    ->all();

                return [
                    'id' => $transaction['id'],
                    'or_number' => $transaction['or_number'],
                    'transaction_number' => $transaction['transaction_number'],
                    'customer_name' => $transaction['customer_name'] ?? 'Walk-in Customer',
                    'transaction_date' => $transaction['transaction_date'],
                    'products' => $products,
                    'total_sales' => (float) ($transaction['total_amount'] ?? 0),
                    'actual_cash_paid' => $this->cashAmount($transaction),
                    'payment_methods' => $paymentMethods,
                    'program_names' => $this->programNames($transaction),
                    'mdr_deduction' => $this->mdrDeduction($transaction),
                    'net_profit' => $this->netProfit($transaction),
                ];
            })
            ->values()
            ->all();
    }

    public function summary(Collection $transactions): array
    {
        return [
            'grossSales' => round((float) $transactions->sum(fn (array $transaction) => (float) ($transaction['subtotal'] ?? $transaction['total_amount'] ?? 0)), 2),
            'netSales' => round((float) $transactions->sum(fn (array $transaction) => (float) ($transaction['total_amount'] ?? 0)), 2),
            'transactionCount' => $transactions->count(),
        ];
    }

    public function dynamicPaymentColumns(Collection $transactions): array
    {
        $seen = [];
        $columns = [];

        foreach ($transactions as $transaction) {
            foreach (($transaction['payments_json']['payments'] ?? []) as $payment) {
                $label = $this->normalizedNonCashPaymentMethod($payment);

                if ($label === null || in_array($label, $seen, true)) {
                    continue;
                }

                $seen[] = $label;
                $columns[] = $label;
            }
        }

        return $columns;
    }

    public function ledgerRows(Collection $transactions, array $dynamicPaymentColumns): array
    {
        return $transactions
            ->values()
            ->flatMap(function (array $transaction, int $transactionIndex) use ($dynamicPaymentColumns): array {
                $items = collect($transaction['items'] ?? [])->values();
                if ($items->isEmpty()) {
                    $items = collect([[]]);
                }

                $paymentContexts = collect($transaction['payments_json']['payments'] ?? [])
                    ->map(function (array $payment): array {
                        $payment['normalized_method_label'] = $this->normalizedNonCashPaymentMethod($payment);

                        return $payment;
                    })
                    ->values();

                if ($paymentContexts->isEmpty()) {
                    $paymentContexts = collect([null]);
                }

                $nonZeroItems = $items->filter(fn (array $item) => (float) ($item['unit_price'] ?? 0) > 0)->values();
                $lastNonZeroItemIndex = $items->reduce(
                    fn (int $carry, array $item, int $index) => (float) ($item['unit_price'] ?? 0) > 0 ? $index : $carry,
                    -1,
                );

                return $items->flatMap(function (array $item, int $itemIndex) use ($transaction, $transactionIndex, $paymentContexts, $dynamicPaymentColumns, $nonZeroItems, $lastNonZeroItemIndex): array {
                    $value = (float) ($item['unit_price'] ?? 0);
                    $isZeroValueProduct = $value === 0.0;
                    $paymentRows = $isZeroValueProduct ? collect([$paymentContexts->first()]) : $paymentContexts;

                    return $paymentRows->map(function (?array $payment, int $paymentIndex) use ($transaction, $transactionIndex, $item, $itemIndex, $value, $isZeroValueProduct, $dynamicPaymentColumns, $nonZeroItems, $lastNonZeroItemIndex, $paymentContexts): array {
                        $paymentMethodLabel = $payment['normalized_method_label'] ?? null;
                        $paymentType = $this->normalizedPaymentType($payment);
                        $isLoanBasedPayment = in_array($paymentType, ['card', 'financing'], true);
                        $loanTermMonths = (int) ($payment['payment_details']['loan_term_months'] ?? 0);
                        $discountAmount = (float) ($item['discount_amount'] ?? 0);
                        $nonCashAmount = $paymentMethodLabel ? (float) ($payment['amount'] ?? 0) : null;
                        $actualCashPaid = $this->itemCashShare(
                            $payment,
                            $item,
                            $itemIndex,
                            $nonZeroItems->count(),
                            $lastNonZeroItemIndex,
                            $isZeroValueProduct,
                            $paymentContexts->count() > 1,
                        );

                        $dynamicAmounts = [];
                        foreach ($dynamicPaymentColumns as $column) {
                            $dynamicAmounts[$column] = $isZeroValueProduct
                                ? null
                                : ($paymentMethodLabel === $column ? (float) ($payment['amount'] ?? 0) : 0.0);
                        }

                        return [
                            'id' => sprintf('%s-%s-%s-%s', $transaction['id'], $itemIndex, $paymentIndex, $transactionIndex),
                            'customerName' => $paymentIndex > 0 || $itemIndex > 0 ? '' : ($transaction['customer_name'] ?? 'Walk-in Customer'),
                            'contactNumber' => $paymentIndex > 0 || $itemIndex > 0 ? '' : ($transaction['customer_phone'] ?? 'N/A'),
                            'drNumber' => $paymentIndex > 0 || $itemIndex > 0 ? '' : ($transaction['transaction_number'] ?? '-'),
                            'orNumber' => $paymentIndex > 0 || $itemIndex > 0 ? '' : ($transaction['or_number'] ?? '-'),
                            'productName' => $paymentIndex > 0 ? '' : trim((string) ($item['display_name'] ?? $item['variant_name'] ?? $item['product_name'] ?? 'Item')),
                            'condition' => $paymentIndex > 0 ? '' : ($item['condition'] ?? '-'),
                            'warranty' => $paymentIndex > 0 ? '' : ($item['warranty_description'] ?? '-'),
                            'quantity' => $paymentIndex > 0 ? '' : (int) ($item['quantity'] ?? 1),
                            'barcode' => $paymentIndex > 0 ? '' : ($item['imei1'] ?? $item['imei2'] ?? $item['serial_number'] ?? '-'),
                            'value' => $paymentIndex > 0 ? null : $value,
                            'salesPersonName' => $paymentIndex > 0 ? '' : ($transaction['sales_representative_name'] ?? 'N/A'),
                            'date' => $paymentIndex > 0 ? null : ($transaction['transaction_date'] ?? null),
                            'actualCashPaid' => $isZeroValueProduct ? null : $actualCashPaid,
                            'discountAmount' => $isZeroValueProduct || $paymentIndex > 0 || $discountAmount <= 0 ? null : $discountAmount,
                            'nonCashPaymentAmount' => $isZeroValueProduct ? null : $nonCashAmount,
                            'nonCashReferenceNumber' => $paymentMethodLabel ? ($payment['payment_details']['reference_number'] ?? '-') : '-',
                            'loanTermLabel' => $paymentMethodLabel && $isLoanBasedPayment ? ($loanTermMonths > 0 ? $loanTermMonths.' months' : 'Straight Payment') : '-',
                            'dynamicPaymentAmounts' => $dynamicAmounts,
                        ];
                    })->all();
                })->all();
            })
            ->values()
            ->all();
    }

    public function paymentMdrAmount(?array $payment): float
    {
        if ($payment === null) {
            return 0.0;
        }

        if (! in_array($this->normalizedPaymentType($payment), ['card', 'financing'], true)) {
            return 0.0;
        }

        $rate = $this->fixedMdrRate((int) ($payment['payment_details']['loan_term_months'] ?? 0));

        return $rate === null ? 0.0 : round((float) ($payment['amount'] ?? 0) * $rate, 2);
    }

    public function cashAmount(array $transaction): float
    {
        return round((float) collect($transaction['payments_json']['payments'] ?? [])
            ->sum(fn (array $payment) => $this->normalizedPaymentType($payment) === 'cash' ? (float) ($payment['amount'] ?? 0) : 0.0), 2);
    }

    public function mdrDeduction(array $transaction): float
    {
        return round((float) collect($transaction['payments_json']['payments'] ?? [])
            ->sum(fn (array $payment) => $this->paymentMdrAmount($payment)), 2);
    }

    public function netProfit(array $transaction): float
    {
        $grossProfit = collect($transaction['items'] ?? [])
            ->sum(fn (array $item) => (float) ($item['line_total'] ?? 0) - (float) ($item['snapshot_cost_price'] ?? 0));

        return round((float) $grossProfit - $this->mdrDeduction($transaction), 2);
    }

    public function isoWeekNumber(?string $dateTime): ?int
    {
        return $dateTime ? Carbon::parse($dateTime)->isoWeek() : null;
    }

    private function programNames(array $transaction): array
    {
        return collect($transaction['payments_json']['payments'] ?? [])
            ->filter(fn (array $payment) => in_array($this->normalizedPaymentType($payment), ['card', 'financing'], true))
            ->map(function (array $payment): string {
                $method = trim((string) ($payment['payment_method'] ?? ''));
                $months = (int) ($payment['payment_details']['loan_term_months'] ?? 0);

                return $months > 0 ? trim($method.' '.$months.' months') : ($method !== '' ? $method : 'Program');
            })
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function normalizedNonCashPaymentMethod(?array $payment): ?string
    {
        if ($payment === null) {
            return null;
        }

        $methodName = trim((string) ($payment['payment_method'] ?? ''));
        if ($methodName === '') {
            return null;
        }

        $normalizedMethod = strtolower($methodName);
        if (in_array($normalizedMethod, ['cash', 'terminal fee'], true)) {
            return null;
        }

        $bankName = trim((string) ($payment['payment_details']['bank'] ?? ''));
        if (in_array($methodName, ['Credit Card', 'Bank Transfer'], true) && $bankName !== '') {
            return $methodName.' ('.$bankName.')';
        }

        return $methodName;
    }

    private function normalizedPaymentType(?array $payment): string
    {
        if ($payment === null) {
            return 'other';
        }

        $explicitType = strtolower(trim((string) ($payment['type'] ?? '')));
        if ($explicitType !== '') {
            return $explicitType;
        }

        $methodName = strtolower(trim((string) ($payment['payment_method'] ?? '')));
        $hasLoanMetadata = array_key_exists('loan_term_months', $payment['payment_details'] ?? []);

        return match (true) {
            $methodName === 'cash' => 'cash',
            str_contains($methodName, 'credit card'), $methodName === 'card', str_contains($methodName, 'debit') => 'card',
            str_contains($methodName, 'financing'), $hasLoanMetadata => 'financing',
            str_contains($methodName, 'bank transfer') => 'bank_transfer',
            str_contains($methodName, 'ewallet'), str_contains($methodName, 'e-wallet'), str_contains($methodName, 'gcash'), str_contains($methodName, 'maya') => 'ewallet',
            str_contains($methodName, 'cheque'), str_contains($methodName, 'check') => 'cheque',
            default => 'other',
        };
    }

    private function fixedMdrRate(int $loanTermMonths): ?float
    {
        if ($loanTermMonths === 0) {
            return 0.035;
        }

        return [
            3 => 0.045,
            6 => 0.065,
            8 => 0.085,
            9 => 0.095,
            12 => 0.125,
            24 => 0.245,
        ][$loanTermMonths] ?? null;
    }

    private function itemCashShare(
        ?array $payment,
        array $item,
        int $itemIndex,
        int $nonZeroItemCount,
        int $lastNonZeroItemIndex,
        bool $isZeroValueProduct,
        bool $hasMultiplePaymentMethods,
    ): ?float {
        if ($payment === null || $this->normalizedPaymentType($payment) !== 'cash' || $isZeroValueProduct) {
            return null;
        }

        if ($nonZeroItemCount <= 1) {
            return round((float) ($payment['amount'] ?? 0), 2);
        }

        if (! $hasMultiplePaymentMethods) {
            return round((float) ($item['line_total'] ?? 0), 2);
        }

        $totalCashCents = (int) round(((float) ($payment['amount'] ?? 0)) * 100);
        $baseShareCents = (int) floor($totalCashCents / $nonZeroItemCount);
        $remainderCents = $totalCashCents - ($baseShareCents * $nonZeroItemCount);
        $share = $itemIndex === $lastNonZeroItemIndex ? $baseShareCents + $remainderCents : $baseShareCents;

        return round($share / 100, 2);
    }
}
