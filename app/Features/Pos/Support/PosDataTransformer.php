<?php

namespace App\Features\Pos\Support;

use App\Features\Inventory\Support\InventoryDataTransformer;
use App\Models\CompanyInfo;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerContact;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionPayment;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\Storage;

class PosDataTransformer
{
    public const VAT_RATE = 12;

    public function transformCashier(User $user, ?Employee $employee, ?string $error = null): array
    {
        return [
            'user_id' => $user->id,
            'employee_id' => $employee?->id,
            'name' => $employee ? $this->employeeFullName($employee) : $user->name,
            'full_name' => $employee ? $this->employeeFullName($employee) : $user->name,
            'email' => $employee?->email ?: $user->email,
            'employee_code' => $employee?->employee_id,
            'setup_error' => $error,
        ];
    }

    public function transformActiveSession(?PosSession $session): ?array
    {
        if ($session === null) {
            return null;
        }

        $session->loadMissing('warehouse', 'employee');

        return [
            'id' => $session->id,
            'session_number' => $session->session_number,
            'employee_id' => $session->employee_id,
            'warehouse_id' => $session->warehouse_id,
            'opening_balance' => (float) $session->opening_balance,
            'closing_balance' => $session->closing_balance !== null ? (float) $session->closing_balance : null,
            'shift_start_time' => optional($session->shift_start_time)?->toDateTimeString(),
            'shift_end_time' => optional($session->shift_end_time)?->toDateTimeString(),
            'status' => $session->status,
            'cashier_remarks' => $session->cashier_remarks,
            'warehouse_name' => $session->warehouse?->name,
            'employee_name' => $session->employee ? $this->employeeFullName($session->employee) : null,
        ];
    }

    public function transformWarehouse(Warehouse $warehouse): array
    {
        return InventoryDataTransformer::transformWarehouse($warehouse);
    }

    public function transformCustomer(Customer $customer): array
    {
        $customer->loadMissing(['contacts', 'addresses', 'salesTransactions.items.inventoryItem.productVariant.productMaster.model.brand']);

        /** @var CustomerContact|null $contact */
        $contact = $customer->contacts
            ->sortByDesc(fn (CustomerContact $entry) => (int) $entry->is_primary)
            ->first();

        /** @var CustomerAddress|null $address */
        $address = $customer->addresses
            ->sortByDesc(fn (CustomerAddress $entry) => (int) $entry->is_primary)
            ->first();

        $transactions = $customer->salesTransactions;
        $frequentPurchases = $transactions
            ->flatMap(fn (SalesTransaction $transaction) => $transaction->items)
            ->groupBy(fn (SalesTransactionItem $item) => $item->inventoryItem?->productVariant?->product_master_id ?: $item->inventory_item_id)
            ->map(function ($items) {
                /** @var SalesTransactionItem $first */
                $first = $items->first();

                return [
                    'product_name' => $first?->inventoryItem?->productVariant?->productMaster?->product_name
                        ?? $first?->inventoryItem?->productVariant?->variant_name
                        ?? 'Item',
                    'count' => $items->count(),
                ];
            })
            ->sortByDesc('count')
            ->take(3)
            ->values()
            ->all();

        return [
            'id' => $customer->id,
            'customer_code' => $customer->customer_code,
            'customer_kind' => $customer->customer_kind,
            'first_name' => $customer->firstname,
            'last_name' => $customer->lastname,
            'full_name' => $this->customerFullName($customer),
            'phone' => $contact?->phone,
            'email' => $contact?->email,
            'address_json' => [
                'street' => $address?->street,
                'barangay' => $address?->barangay,
                'city_municipality' => $address?->city_municipality,
                'province' => $address?->province,
                'region' => $address?->region,
                'postal_code' => $address?->postal_code,
                'country' => $address?->country === 'PH' ? 'Philippines' : $address?->country,
            ],
            'insights' => [
                'transaction_count' => $transactions->count(),
                'last_visit_at' => optional($transactions->sortByDesc('created_at')->first()?->created_at)?->toDateTimeString(),
                'frequent_purchases' => $frequentPurchases,
            ],
        ];
    }

    public function transformSalesRep(Employee $employee): array
    {
        $employee->loadMissing('jobTitle.department');

        return [
            'id' => $employee->id,
            'employee_id' => $employee->employee_id,
            'full_name' => $this->employeeFullName($employee),
            'first_name' => $employee->first_name,
            'last_name' => $employee->last_name,
            'job_title' => $employee->jobTitle?->name,
            'department' => $employee->jobTitle?->department?->name,
            'label' => trim($this->employeeFullName($employee).' - '.($employee->jobTitle?->name ?? '')),
            'status' => $employee->status,
        ];
    }

    public function transformPaymentMethod(PaymentMethod $paymentMethod): array
    {
        return [
            'id' => (string) $paymentMethod->id,
            'name' => $paymentMethod->name,
            'type' => $paymentMethod->type,
            'logo' => $paymentMethod->logo,
        ];
    }

    public function transformCompanyInfo(?CompanyInfo $companyInfo): array
    {
        return [
            'company_name' => $companyInfo?->company_name,
            'legal_name' => $companyInfo?->legal_name,
            'tax_id' => $companyInfo?->tax_id,
            'address' => $companyInfo?->address,
            'phone' => $companyInfo?->phone,
            'email' => $companyInfo?->email,
            'website' => $companyInfo?->website,
            'logo_url' => $companyInfo?->logo_path ? Storage::disk('public')->url($companyInfo->logo_path) : null,
            'tax_rate' => self::VAT_RATE,
        ];
    }

    public function transformInventorySearchItem(InventoryItem $item, int $stockOnHand): array
    {
        $item->loadMissing([
            'productVariant.values.attribute',
            'productVariant.productMaster.model.brand',
            'productVariant.productMaster.subcategory.parent',
        ]);

        $variant = $item->productVariant;
        $productMaster = $variant?->productMaster;
        $attributes = InventoryDataTransformer::variantAttributes($variant);

        $brandName = $productMaster?->model?->brand?->name ?? '';
        $modelName = $productMaster?->model?->model_name ?? '';
        $variantName = $variant?->variant_name ?? '';
        $condition = $variant?->condition ?? '';

        return [
            'id' => $item->id,
            'inventory_id' => $item->id,
            'product_master_id' => $productMaster?->id,
            'variant_id' => $variant?->id,
            'warehouse_id' => $item->warehouse_id,
            'product_name' => $productMaster?->product_name ?? trim($brandName.' '.$modelName),
            'model' => $modelName,
            'brand_name' => $brandName,
            'category_name' => $productMaster?->subcategory?->parent?->name ?? '',
            'variant_name' => $variantName,
            'condition' => $condition,
            'attributes' => $attributes,
            'displayName' => trim(implode(' ', array_filter([$brandName, $modelName, $variantName, $condition]))),
            'imei1' => $item->imei,
            'imei2' => $item->imei2,
            'serial_number' => $item->serial_number,
            'barcode' => collect([$item->imei, $item->imei2, $item->serial_number])->filter()->implode(' '),
            'cost_price' => $item->cost_price !== null ? (float) $item->cost_price : 0.0,
            'cash_price' => $item->cash_price !== null ? (float) $item->cash_price : 0.0,
            'srp' => $item->srp_price !== null ? (float) $item->srp_price : 0.0,
            'warranty_description' => $item->warranty,
            'stock_on_hand' => $stockOnHand,
            'status' => $item->status,
            'is_bundle' => false,
            'bundle_serial' => null,
            'bundle_components' => [],
        ];
    }

    public function transformTransaction(SalesTransaction $transaction): array
    {
        $transaction->loadMissing([
            'customer.contacts',
            'customer.addresses',
            'salesRepresentative.jobTitle.department',
            'posSession.warehouse',
            'items.inventoryItem.productVariant.values.attribute',
            'items.inventoryItem.productVariant.productMaster.model.brand',
            'items.inventoryItem.productVariant.productMaster.subcategory.parent',
            'items.components.inventoryItem.productVariant.productMaster.model.brand',
            'payments.paymentMethod',
            'payments.detail.documents',
            'documents',
        ]);

        $items = $transaction->items->map(function (SalesTransactionItem $item) {
            $inventoryItem = $item->inventoryItem;
            $variant = $inventoryItem?->productVariant;
            $productMaster = $variant?->productMaster;

            return [
                'inventory_id' => $inventoryItem?->id,
                'inventory_item_id' => $inventoryItem?->id,
                'product_master_id' => $productMaster?->id,
                'variant_id' => $variant?->id,
                'product_name' => $productMaster?->product_name,
                'variant_name' => $variant?->variant_name,
                'brand_name' => $productMaster?->model?->brand?->name,
                'imei1' => $inventoryItem?->imei,
                'imei2' => $inventoryItem?->imei2,
                'serial_number' => $inventoryItem?->serial_number,
                'price_basis' => $item->price_basis,
                'unit_price' => (float) ($item->price_basis === SalesTransactionItem::PRICE_BASIS_SRP
                    ? ($item->snapshot_srp ?? 0)
                    : ($item->snapshot_cash_price ?? 0)),
                'snapshot_cash_price' => (float) ($item->snapshot_cash_price ?? 0),
                'snapshot_srp' => (float) ($item->snapshot_srp ?? 0),
                'snapshot_cost_price' => (float) ($item->snapshot_cost_price ?? 0),
                'discount_amount' => (float) ($item->discount_amount ?? 0),
                'line_total' => (float) $item->line_total,
                'warranty_description' => $inventoryItem?->warranty,
                'is_bundle' => (bool) $item->is_bundle,
                'bundle_serial' => $item->bundle_serial,
                'bundle_components' => $item->components->map(fn ($component) => [
                    'inventory_id' => $component->inventory_item_id,
                    'product_name' => $component->inventoryItem?->productVariant?->productMaster?->product_name,
                    'variant_name' => $component->inventoryItem?->productVariant?->variant_name,
                    'imei1' => $component->inventoryItem?->imei,
                    'serial_number' => $component->inventoryItem?->serial_number,
                ])->values()->all(),
            ];
        })->values();

        $payments = $transaction->payments->map(function (SalesTransactionPayment $payment) {
            $detail = $payment->detail;

            return [
                'payment_method_id' => (string) $payment->payment_method_id,
                'payment_method' => $payment->paymentMethod?->name,
                'type' => $payment->paymentMethod?->type,
                'amount' => (float) $payment->amount,
                'payment_details' => [
                    'is_cash' => $detail?->is_cash,
                    'reference_number' => $detail?->reference_number,
                    'downpayment' => $detail?->downpayment,
                    'bank' => $detail?->bank,
                    'terminal_used' => $detail?->terminal_used,
                    'card_holder_name' => $detail?->card_holder_name,
                    'loan_term_months' => $detail?->loan_term_months,
                    'sender_mobile' => $detail?->sender_mobile,
                    'contract_id' => $detail?->contract_id,
                    'registered_mobile' => $detail?->registered_mobile,
                    'supporting_doc_urls' => $detail?->documents->map(fn ($document) => [
                        'name' => $document->document_name,
                        'url' => $document->document_url,
                        'type' => $document->document_type,
                    ])->values()->all() ?? [],
                ],
            ];
        })->values();

        $amountPaid = (float) $payments->sum('amount');
        $subtotal = (float) $items->sum(fn (array $item) => $item['unit_price']);
        $discountAmount = (float) $items->sum('discount_amount');

        return [
            'id' => $transaction->id,
            'transaction_number' => $transaction->transaction_number,
            'or_number' => $transaction->or_number,
            'transaction_date' => optional($transaction->created_at)?->toDateTimeString(),
            'customer_id' => $transaction->customer_id,
            'customer_name' => $transaction->customer ? $this->customerFullName($transaction->customer) : null,
            'sales_representative_id' => $transaction->sales_representative_id,
            'sales_representative_name' => $transaction->salesRepresentative ? $this->employeeFullName($transaction->salesRepresentative) : null,
            'pos_session_id' => $transaction->pos_session_id,
            'warehouse_name' => $transaction->posSession?->warehouse?->name,
            'mode_of_release' => $transaction->mode_of_release,
            'remarks' => $transaction->remarks,
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'tax_amount' => 0.0,
            'total_amount' => (float) $transaction->total_amount,
            'amount_paid' => $amountPaid,
            'change_amount' => max(0, $amountPaid - (float) $transaction->total_amount),
            'items' => $items->all(),
            'payments' => $payments->all(),
            'payments_json' => [
                'payments' => $payments->all(),
            ],
            'documents' => $transaction->documents->map(fn ($document) => [
                'document_type' => $document->document_type,
                'document_name' => $document->document_name,
                'document_url' => $document->document_url,
            ])->values()->all(),
        ];
    }

    public function nextTransactionNumberPreview(): string
    {
        $latestNumber = SalesTransaction::query()
            ->orderByDesc('id')
            ->value('transaction_number');

        if (! is_string($latestNumber) || ! preg_match('/(\d+)$/', $latestNumber, $matches)) {
            return '000001';
        }

        return sprintf('%06d', ((int) $matches[1]) + 1);
    }

    private function employeeFullName(Employee $employee): string
    {
        return trim($employee->first_name.' '.$employee->last_name);
    }

    private function customerFullName(Customer $customer): string
    {
        if ($customer->customer_kind === Customer::KIND_ORGANIZATION) {
            return (string) ($customer->organization_name ?: $customer->legal_name);
        }

        return trim($customer->firstname.' '.$customer->lastname);
    }
}
