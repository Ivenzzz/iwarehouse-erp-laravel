<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionDocument;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionItemComponent;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\SalesTransactionPaymentDocument;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class PosSalesHistorySeeder extends Seeder
{
    public function run(): void
    {
        $cashier = Employee::query()->where('employee_id', 'EMP-000002')->firstOrFail();
        $salesRep = Employee::query()->where('employee_id', 'EMP-000003')->firstOrFail();
        $warehouse = Warehouse::query()->where('name', 'Main Branch')->firstOrFail();
        $customer = Customer::query()->where('firstname', 'Maria')->where('lastname', 'Santos')->firstOrFail();
        $gcashMethod = PaymentMethod::query()->where('name', 'GCash')->firstOrFail();

        $iphoneVariant = ProductVariant::query()->where('sku', 'APPLE-IP15-8GB-256GB-BLACK')->firstOrFail();
        $chargerVariant = ProductVariant::query()->where('sku', 'ANKER-NANO-20W-WHITE')->firstOrFail();

        $mainSoldItem = InventoryItem::query()->updateOrCreate(
            ['serial_number' => 'IP15-HIST-001'],
            [
                'product_variant_id' => $iphoneVariant->id,
                'warehouse_id' => $warehouse->id,
                'imei' => '359999999999991',
                'status' => 'sold',
                'cost_price' => 40500,
                'cash_price' => 44990,
                'srp_price' => 45990,
                'warranty' => '7 days replacement, 1 year service warranty',
                'encoded_at' => now()->subDays(20),
                'grn_number' => 'GRN-POS-HISTORY',
                'purchase_reference' => 'PO-HISTORY-IPHONE',
            ],
        );

        $bundleComponentItem = InventoryItem::query()->updateOrCreate(
            ['serial_number' => 'CHARGER-HIST-001'],
            [
                'product_variant_id' => $chargerVariant->id,
                'warehouse_id' => $warehouse->id,
                'imei' => null,
                'status' => 'sold',
                'cost_price' => 480,
                'cash_price' => 790,
                'srp_price' => 890,
                'warranty' => '30 days service warranty',
                'encoded_at' => now()->subDays(20),
                'grn_number' => 'GRN-POS-HISTORY',
                'purchase_reference' => 'PO-HISTORY-CHARGER',
            ],
        );

        $session = PosSession::query()->firstOrCreate(
            ['session_number' => 'PSS-900001'],
            [
                'employee_id' => $cashier->id,
                'warehouse_id' => $warehouse->id,
                'opening_balance' => 5000,
                'closing_balance' => 15490,
                'shift_start_time' => now()->subDays(2)->setTime(9, 0),
                'shift_end_time' => now()->subDays(2)->setTime(18, 30),
                'status' => PosSession::STATUS_CLOSED,
                'cashier_remarks' => 'Seeder-created closed session for POS history.',
                'notes' => 'Seeded POS history session',
            ],
        );

        $transaction = SalesTransaction::query()->updateOrCreate(
            ['or_number' => 'OR-POS-000001'],
            [
                'transaction_number' => '900001',
                'customer_id' => $customer->id,
                'pos_session_id' => $session->id,
                'sales_representative_id' => $salesRep->id,
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'remarks' => 'Seeder demo POS sale with bundle component.',
                'notes' => 'Seeded POS sales history record.',
                'total_amount' => 43990,
            ],
        );

        $lineItem = SalesTransactionItem::query()->updateOrCreate(
            [
                'sales_transaction_id' => $transaction->id,
                'inventory_item_id' => $mainSoldItem->id,
            ],
            [
                'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
                'snapshot_cash_price' => 44990,
                'snapshot_srp' => 45990,
                'snapshot_cost_price' => 40500,
                'discount_amount' => 1000,
                'discount_validated_at' => now()->subDays(2)->setTime(11, 15),
                'line_total' => 43990,
                'is_bundle' => true,
                'bundle_serial' => 'BUNDLE-DEMO-001',
            ],
        );

        SalesTransactionItemComponent::query()->updateOrCreate(
            [
                'sales_transaction_item_id' => $lineItem->id,
                'inventory_item_id' => $bundleComponentItem->id,
            ],
            [],
        );

        $payment = SalesTransactionPayment::query()->updateOrCreate(
            [
                'sales_transaction_id' => $transaction->id,
                'payment_method_id' => $gcashMethod->id,
            ],
            ['amount' => 43990],
        );

        $paymentDetail = SalesTransactionPaymentDetail::query()->updateOrCreate(
            ['sales_transaction_payment_id' => $payment->id],
            [
                'reference_number' => 'GCASH-POS-000001',
                'sender_mobile' => '09171234567',
            ],
        );

        SalesTransactionPaymentDocument::query()->updateOrCreate(
            [
                'sales_transaction_payment_detail_id' => $paymentDetail->id,
                'document_name' => 'gcash-payment-slip',
            ],
            [
                'document_url' => 'https://example.com/seeders/pos/gcash-slip.jpg',
                'document_type' => 'image/jpeg',
            ],
        );

        SalesTransactionDocument::query()->updateOrCreate(
            [
                'sales_transaction_id' => $transaction->id,
                'document_type' => 'official_receipt',
            ],
            [
                'document_name' => 'Official Receipt',
                'document_url' => 'https://example.com/seeders/pos/official-receipt.jpg',
            ],
        );

        SalesTransactionDocument::query()->updateOrCreate(
            [
                'sales_transaction_id' => $transaction->id,
                'document_type' => 'customer_id',
            ],
            [
                'document_name' => 'Customer ID',
                'document_url' => 'https://example.com/seeders/pos/customer-id.jpg',
            ],
        );
    }
}
