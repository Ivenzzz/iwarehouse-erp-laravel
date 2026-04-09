<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Department;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\SalesTransaction;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

class SalesTransactionsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_transaction_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('sales_transactions'));
        $this->assertTrue(Schema::hasTable('sales_transaction_items'));
        $this->assertTrue(Schema::hasTable('sales_transaction_item_components'));
        $this->assertTrue(Schema::hasTable('sales_transaction_payments'));
        $this->assertTrue(Schema::hasTable('sales_transaction_payment_details'));
        $this->assertTrue(Schema::hasTable('sales_transaction_payment_documents'));
        $this->assertTrue(Schema::hasTable('sales_transaction_documents'));
    }

    public function test_transaction_number_is_auto_generated_and_unique(): void
    {
        [$customer, $posSession] = $this->createSalesContext();

        $first = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $second = SalesTransaction::create([
            'or_number' => 'OR-0002',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 2000,
        ]);

        $this->assertSame('000001', $first->transaction_number);
        $this->assertSame('000002', $second->transaction_number);
    }

    public function test_or_number_is_required(): void
    {
        [$customer, $posSession] = $this->createSalesContext();

        $this->expectException(InvalidArgumentException::class);

        SalesTransaction::create([
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);
    }

    public function test_duplicate_or_number_is_rejected(): void
    {
        [$customer, $posSession] = $this->createSalesContext();

        SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $this->expectException(QueryException::class);

        SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1200,
        ]);
    }

    public function test_customer_and_pos_session_are_required_and_sales_representative_is_nullable(): void
    {
        [, $posSession] = $this->createSalesContext();

        $this->expectException(InvalidArgumentException::class);

        SalesTransaction::create([
            'or_number' => 'OR-0001',
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);
    }

    public function test_sales_transaction_can_be_created_without_sales_representative(): void
    {
        [$customer, $posSession] = $this->createSalesContext();

        $transaction = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $this->assertNull($transaction->sales_representative_id);
        $this->assertDatabaseHas('sales_transactions', [
            'id' => $transaction->id,
            'or_number' => 'OR-0001',
            'sales_representative_id' => null,
        ]);
    }

    public function test_sales_item_uses_inventory_item_id_and_has_no_quantity_column(): void
    {
        [$customer, $posSession] = $this->createSalesContext();
        $inventoryItem = $this->createInventoryItem('SN-0001');
        $transaction = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $item = $transaction->items()->create([
            'inventory_item_id' => $inventoryItem->id,
            'line_total' => 1000,
        ]);

        $this->assertDatabaseHas('sales_transaction_items', [
            'id' => $item->id,
            'inventory_item_id' => $inventoryItem->id,
        ]);
        $this->assertFalse(Schema::hasColumn('sales_transaction_items', 'quantity'));
    }

    public function test_bundle_components_are_attached_through_components_table(): void
    {
        [$customer, $posSession] = $this->createSalesContext();
        $bundleItem = $this->createInventoryItem('SN-BUNDLE');
        $componentItem = $this->createInventoryItem('SN-COMP');
        $transaction = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $item = $transaction->items()->create([
            'inventory_item_id' => $bundleItem->id,
            'line_total' => 1000,
            'is_bundle' => true,
            'bundle_serial' => 'BUNDLE-001',
        ]);

        $component = $item->components()->create([
            'inventory_item_id' => $componentItem->id,
        ]);

        $this->assertDatabaseHas('sales_transaction_item_components', [
            'id' => $component->id,
            'sales_transaction_item_id' => $item->id,
            'inventory_item_id' => $componentItem->id,
        ]);
    }

    public function test_payment_rows_require_payment_method_and_can_have_detail_and_documents(): void
    {
        [$customer, $posSession] = $this->createSalesContext();
        $paymentMethod = PaymentMethod::create([
            'name' => 'Cash',
            'type' => 'cash',
        ]);
        $transaction = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $payment = $transaction->payments()->create([
            'payment_method_id' => $paymentMethod->id,
            'amount' => 1000,
        ]);

        $detail = $payment->detail()->create([
            'is_cash' => true,
            'reference_number' => 'REF-001',
        ]);

        $document = $detail->documents()->create([
            'document_name' => 'Proof',
            'document_url' => '/docs/proof.png',
            'document_type' => 'receipt',
        ]);

        $this->assertDatabaseHas('sales_transaction_payments', [
            'id' => $payment->id,
            'payment_method_id' => $paymentMethod->id,
        ]);
        $this->assertDatabaseHas('sales_transaction_payment_details', [
            'id' => $detail->id,
            'sales_transaction_payment_id' => $payment->id,
            'reference_number' => 'REF-001',
        ]);
        $this->assertDatabaseHas('sales_transaction_payment_documents', [
            'id' => $document->id,
            'sales_transaction_payment_detail_id' => $detail->id,
            'document_type' => 'receipt',
        ]);
    }

    public function test_transaction_support_documents_are_stored_as_typed_child_rows(): void
    {
        [$customer, $posSession] = $this->createSalesContext();
        $transaction = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'total_amount' => 1000,
        ]);

        $document = $transaction->documents()->create([
            'document_type' => 'official_receipt',
            'document_name' => 'OR PDF',
            'document_url' => '/docs/or.pdf',
        ]);

        $this->assertDatabaseHas('sales_transaction_documents', [
            'id' => $document->id,
            'sales_transaction_id' => $transaction->id,
            'document_type' => 'official_receipt',
        ]);
    }

    public function test_restrictive_deletes_block_referenced_records(): void
    {
        [$customer, $posSession, $salesRepresentative] = $this->createSalesContext(withSalesRepresentative: true);
        $inventoryItem = $this->createInventoryItem('SN-0001');
        $componentInventoryItem = $this->createInventoryItem('SN-0002');
        $paymentMethod = PaymentMethod::create([
            'name' => 'GCash',
            'type' => 'ewallet',
        ]);
        $transaction = SalesTransaction::create([
            'or_number' => 'OR-0001',
            'customer_id' => $customer->id,
            'pos_session_id' => $posSession->id,
            'sales_representative_id' => $salesRepresentative->id,
            'total_amount' => 1000,
        ]);
        $item = $transaction->items()->create([
            'inventory_item_id' => $inventoryItem->id,
            'line_total' => 1000,
            'is_bundle' => true,
        ]);
        $item->components()->create([
            'inventory_item_id' => $componentInventoryItem->id,
        ]);
        $transaction->payments()->create([
            'payment_method_id' => $paymentMethod->id,
            'amount' => 1000,
        ]);

        $this->assertFalse($this->canDelete(fn () => $customer->forceDelete()));
        $this->assertFalse($this->canDelete(fn () => $posSession->delete()));
        $this->assertFalse($this->canDelete(fn () => $salesRepresentative->delete()));
        $this->assertFalse($this->canDelete(fn () => $paymentMethod->delete()));
        $this->assertFalse($this->canDelete(fn () => $inventoryItem->delete()));
        $this->assertFalse($this->canDelete(fn () => $componentInventoryItem->delete()));
    }

    private function createSalesContext(bool $withSalesRepresentative = false): array
    {
        $customer = Customer::create([
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
        ]);

        $cashier = $this->createEmployee('EMP-CASHIER');
        $warehouse = Warehouse::create([
            'name' => 'Sales Floor',
            'warehouse_type' => 'store',
        ]);
        $posSession = PosSession::create([
            'employee_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
        ]);

        if (! $withSalesRepresentative) {
            return [$customer, $posSession];
        }

        return [$customer, $posSession, $this->createEmployee('EMP-SALESREP')];
    }

    private function createEmployee(string $employeeCode): Employee
    {
        $department = Department::create(['name' => 'Sales '.$employeeCode]);
        $jobTitle = $department->jobTitles()->create(['name' => 'Associate '.$employeeCode]);

        return Employee::create([
            'employee_id' => $employeeCode,
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Test',
            'last_name' => 'Employee',
        ]);
    }

    private function createInventoryItem(string $serialNumber): InventoryItem
    {
        $brand = ProductBrand::create(['name' => 'Brand '.$serialNumber]);
        $category = ProductCategory::create([
            'name' => 'Phones '.$serialNumber,
            'parent_category_id' => null,
        ]);
        $subcategory = ProductCategory::create([
            'name' => 'Smartphones '.$serialNumber,
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => 'Model '.$serialNumber,
        ]);
        $productMaster = ProductMaster::create([
            'master_sku' => 'SKU-'.$serialNumber,
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
        ]);
        $variant = ProductVariant::create([
            'product_master_id' => $productMaster->id,
            'variant_name' => 'Variant '.$serialNumber,
            'sku' => 'VAR-'.$serialNumber,
            'condition' => 'Brand New',
            'is_active' => true,
        ]);
        $warehouse = Warehouse::firstOrCreate(
            ['name' => 'Inventory Warehouse'],
            ['warehouse_type' => 'store']
        );

        return InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'serial_number' => $serialNumber,
            'status' => 'active',
            'cash_price' => 1000,
            'srp_price' => 1200,
            'cost_price' => 800,
        ]);
    }

    private function canDelete(callable $callback): bool
    {
        try {
            DB::transaction(function () use ($callback) {
                $callback();

                throw new \RuntimeException('rollback');
            });
        } catch (QueryException) {
            return false;
        } catch (\RuntimeException $exception) {
            if ($exception->getMessage() === 'rollback') {
                return true;
            }

            throw $exception;
        }

        return true;
    }
}
