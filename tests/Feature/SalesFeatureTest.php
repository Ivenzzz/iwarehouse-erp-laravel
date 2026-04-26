<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerContact;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\JobTitle;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\ProductBrand;
use App\Models\ProductCategory;
use App\Models\ProductMaster;
use App\Models\ProductModel;
use App\Models\ProductVariant;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionDocument;
use App\Models\SalesTransactionItem;
use App\Models\SalesTransactionPayment;
use App\Models\SalesTransactionPaymentDetail;
use App\Models\SalesTransactionPaymentDocument;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class SalesFeatureTest extends TestCase
{
    use RefreshDatabase;

    private int $inventorySequence = 1;
    private int $employeeSequence = 1;
    private int $transactionSequence = 1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->createCustomerDefaults();
    }

    public function test_sales_index_route_is_live_and_renders_server_rows(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        $cashier = $this->createEmployee('Cashier');
        $session = $this->createSession($cashier, $warehouse);
        $salesRep = $this->createEmployee('Sales Representative');
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $customer = $this->createCustomer('Juan', 'Dela Cruz');
        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);
        $inventory = $this->createInventoryItem($variant, $warehouse, cash: 32000, cost: 21000);

        $this->createTransaction($session, $customer, $inventory, $cash, $salesRep, createdAt: now()->subDay());

        $this->actingAs($user)
            ->get(route('sales.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Sales')
                ->where('filters.search', '')
                ->where('filters.warehouse', 'all')
                ->where('filters.sort', 'transaction_date')
                ->where('filters.direction', 'desc')
                ->where('filters.perPage', 25)
                ->where('filters.page', 1)
                ->has('warehouses', 1)
                ->where('rows.per_page', 25)
                ->where('rows.total', 1)
                ->has('rows.data', 1)
                ->where('rows.data.0.warehouse_name', 'Main Branch')
                ->where('rows.data.0.customer_name', 'Juan Dela Cruz')
                ->where('rows.data.0.sales_representative_name', 'Sales Representative 002')
                ->where('rows.data.0.total_amount', 32000)
            );
    }

    public function test_sales_filters_search_and_sort_are_server_side(): void
    {
        $user = User::factory()->create();
        $mainWarehouse = $this->createWarehouse('Main Branch', 1);
        $branchWarehouse = $this->createWarehouse('Branch Store', 2);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $creditCard = PaymentMethod::create(['name' => 'Credit Card', 'type' => 'card']);
        $salesRep = $this->createEmployee('Sales Representative');

        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);

        $mainInventory = $this->createInventoryItem($variant, $mainWarehouse, imei: '111111111111111', cash: 30000, cost: 18000);
        $branchInventory = $this->createInventoryItem($variant, $branchWarehouse, imei: '999999999999999', cash: 45000, cost: 22000);

        $this->createTransaction(
            $this->createSession($this->createEmployee('Cashier'), $mainWarehouse),
            $this->createCustomer('Main', 'Buyer'),
            $mainInventory,
            $cash,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 2, 10, 0, 0),
            orNumber: 'OR-MAIN-1',
        );

        $this->createTransaction(
            $this->createSession($this->createEmployee('Cashier'), $branchWarehouse),
            $this->createCustomer('Branch', 'Buyer'),
            $branchInventory,
            $creditCard,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 4, 12, 0, 0),
            orNumber: 'OR-BRANCH-1',
            detail: ['bank' => 'BPI', 'reference_number' => 'CC-123', 'loan_term_months' => 6],
        );

        $this->actingAs($user)
            ->get(route('sales.index', [
                'warehouse' => $branchWarehouse->id,
                'search' => '999999999999999',
                'sort' => 'total_amount',
                'direction' => 'asc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.warehouse', (string) $branchWarehouse->id)
                ->where('filters.search', '999999999999999')
                ->where('filters.sort', 'total_amount')
                ->where('filters.direction', 'asc')
                ->where('rows.total', 1)
                ->has('rows.data', 1)
                ->where('rows.data.0.or_number', 'OR-BRANCH-1')
                ->where('rows.data.0.warehouse_name', 'Branch Store')
                ->where('rows.data.0.total_amount', 45000)
            );
    }

    public function test_sales_rows_are_server_side_paginated(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $salesRep = $this->createEmployee('Sales Representative');
        $session = $this->createSession($this->createEmployee('Cashier'), $warehouse);
        $customer = $this->createCustomer('Page', 'Buyer');
        [$variant] = $this->createProductGraph('Apple', 'iPhone 17', 'APPLE-IPHONE17', [
            ['name' => '256GB Black', 'sku' => 'APPLE-IPHONE17-256'],
        ]);

        for ($i = 1; $i <= 12; $i++) {
            $inventory = $this->createInventoryItem($variant, $warehouse, cash: 10000 + $i, cost: 7000);
            $this->createTransaction(
                $session,
                $customer,
                $inventory,
                $cash,
                $salesRep,
                createdAt: Carbon::create(2026, 4, 1, 10, 0, 0)->addDays($i - 1),
                orNumber: 'OR-PAGE-'.$i,
            );
        }

        foreach ([10, 25, 50, 100] as $perPage) {
            $this->actingAs($user)
                ->get(route('sales.index', ['perPage' => $perPage]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('filters.perPage', $perPage)
                    ->where('rows.per_page', $perPage)
                    ->where('rows.total', 12)
                );
        }

        $this->actingAs($user)
            ->get(route('sales.index', [
                'sort' => 'transaction_date',
                'direction' => 'asc',
                'perPage' => 10,
                'page' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 10)
                ->where('filters.page', 2)
                ->where('rows.current_page', 2)
                ->where('rows.per_page', 10)
                ->where('rows.total', 12)
                ->has('rows.data', 2)
                ->where('rows.data.0.or_number', 'OR-PAGE-11')
            );

        $this->actingAs($user)
            ->get(route('sales.index', [
                'perPage' => 5,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.perPage', 25)
                ->where('rows.per_page', 25)
                ->where('rows.total', 12)
            );
    }

    public function test_sales_transaction_detail_and_xlsx_export_are_server_backed(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Main Branch', 1);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $salesRep = $this->createEmployee('Sales Representative');
        $session = $this->createSession($this->createEmployee('Cashier'), $warehouse);
        $customer = $this->createCustomer('Maria', 'Santos', withAddress: true);
        [$variant] = $this->createProductGraph('Samsung', 'Galaxy S', 'SAMSUNG-GALAXY', [
            ['name' => '512GB Gray', 'sku' => 'SAMSUNG-GALAXY-512'],
        ]);
        $inventory = $this->createInventoryItem($variant, $warehouse, serial: 'SERIAL-123', cash: 28000, cost: 17000);

        $transaction = $this->createTransaction(
            $session,
            $customer,
            $inventory,
            $cash,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 3, 14, 30, 0),
            orNumber: 'OR-DETAIL-1',
        );
        $secondInventory = $this->createInventoryItem($variant, $warehouse, serial: 'SERIAL-456', cash: 18000, cost: 11000);
        $this->createTransaction(
            $session,
            $customer,
            $secondInventory,
            $cash,
            $salesRep,
            createdAt: Carbon::create(2026, 4, 4, 11, 0, 0),
            orNumber: 'OR-DETAIL-2',
        );

        $this->actingAs($user)
            ->getJson(route('sales.show', $transaction))
            ->assertOk()
            ->assertJsonPath('transaction.customer_name', 'Maria Santos')
            ->assertJsonPath('transaction.customer_address', '123 Mabini, Barangay 1, Manila, Metro Manila, NCR')
            ->assertJsonPath('transaction.items.0.condition', 'Brand New')
            ->assertJsonPath('transaction.items.0.serial_number', 'SERIAL-123');

        $response = $this->actingAs($user)->get(route('sales.export.xlsx', [
            'perPage' => 1,
            'page' => 2,
            'sort' => 'transaction_date',
            'direction' => 'asc',
        ]));
        $response->assertOk();
        $response->assertDownload('sales_'.now()->format('Y-m-d').'.xlsx');

        $tempFile = tempnam(sys_get_temp_dir(), 'sales-xlsx-');
        file_put_contents($tempFile, $response->streamedContent());
        $spreadsheet = IOFactory::load($tempFile);
        $sheet = $spreadsheet->getActiveSheet();

        $this->assertSame('OR Number', $sheet->getCell('A1')->getValue());
        $this->assertSame('OR-DETAIL-1', $sheet->getCell('A2')->getValue());
        $this->assertSame('OR-DETAIL-2', $sheet->getCell('A3')->getValue());
        $this->assertSame('Main Branch', $sheet->getCell('D2')->getValue());

        @unlink($tempFile);
    }

    public function test_sales_import_pos_sessions_creates_rows_from_valid_csv(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Import Branch', 1);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-1001,Imported row,2026-04-25T06:23:28.770Z,,,"1000",Import Branch,opened,Start shift,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z',
        ]);

        $file = UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv);

        $this->actingAs($user)
            ->post(route('sales.import.pos-sessions'), ['file' => $file])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('pos_sessions', [
            'session_number' => 'POS-1001',
            'warehouse_id' => $warehouse->id,
            'user_id' => $user->id,
            'status' => PosSession::STATUS_OPENED,
        ]);
    }

    public function test_sales_import_pos_sessions_upserts_existing_session_and_keeps_closed_from_reopen(): void
    {
        $user = User::factory()->create();
        $warehouseA = $this->createWarehouse('Import Branch A', 1);
        $warehouseB = $this->createWarehouse('Import Branch B', 2);

        $session = PosSession::create([
            'session_number' => 'POS-2001',
            'user_id' => $user->id,
            'warehouse_id' => $warehouseA->id,
            'opening_balance' => 500,
            'closing_balance' => 900,
            'shift_start_time' => Carbon::parse('2026-04-24T06:00:00Z'),
            'shift_end_time' => Carbon::parse('2026-04-24T14:00:00Z'),
            'status' => PosSession::STATUS_CLOSED,
            'notes' => 'Original',
        ]);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-2001,Updated notes,2026-04-25T06:00:00.000Z,2026-04-25T10:00:00.000Z,1300,1200,Import Branch B,opened,csv remarks,2026-04-24T20:00:00.000Z,2026-04-24T20:00:00.000Z',
        ]);
        $file = UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv);

        $this->actingAs($user)
            ->post(route('sales.import.pos-sessions'), ['file' => $file])
            ->assertRedirect(route('sales.index'));

        $session->refresh();
        $this->assertSame(PosSession::STATUS_CLOSED, $session->status);
        $this->assertSame((string) $warehouseB->id, (string) $session->warehouse_id);
        $this->assertSame('Updated notes', $session->notes);
        $this->assertSame(900.0, (float) $session->closing_balance);
    }

    public function test_sales_import_pos_sessions_skips_invalid_rows_and_reports_summary(): void
    {
        $user = User::factory()->create();
        $this->createWarehouse('Import Branch', 1);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-3001,Unknown warehouse,2026-04-25T06:00:00.000Z,,,"1000",Missing Branch,opened,remarks,2026-04-25T00:00:00.000Z,2026-04-25T00:00:00.000Z',
            'POS-3002,Invalid status,2026-04-25T06:00:00.000Z,,,"1000",Import Branch,invalid,remarks,2026-04-25T00:00:00.000Z,2026-04-25T00:00:00.000Z',
            'POS-3003,Missing closed fields,2026-04-25T06:00:00.000Z,,,1000,Import Branch,closed,remarks,2026-04-25T00:00:00.000Z,2026-04-25T00:00:00.000Z',
        ]);
        $file = UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv);

        $response = $this->actingAs($user)->post(route('sales.import.pos-sessions'), ['file' => $file]);
        $response->assertRedirect(route('sales.index'));
        $response->assertSessionHas('import_summary');

        $summary = session('import_summary');
        $this->assertSame(0, $summary['created']);
        $this->assertSame(0, $summary['updated']);
        $this->assertSame(3, $summary['skipped']);
        $this->assertSame(3, $summary['errors']);
        $this->assertNotEmpty($summary['error_rows']);
        $response->assertSessionHas('error');
    }

    public function test_sales_import_pos_sessions_rejects_non_csv_file(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('sessions.pdf', 10, 'application/pdf');

        $this->actingAs($user)
            ->post(route('sales.import.pos-sessions'), ['file' => $file])
            ->assertSessionHasErrors('file');
    }

    public function test_sales_import_pos_sessions_accepts_utf8_bom_header_csv(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Infinix SM Kiosk', 1);

        $header = "\xEF\xBB\xBFsession_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,warehouse_name,status,cashier_remarks,created_date,updated_date";
        $row = 'POS-BOM-1,,2026-04-25T06:23:28.770Z,,,0,Infinix SM Kiosk,opened,,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z';
        $csv = $header."\n".$row;

        $file = UploadedFile::fake()->createWithContent('pos-sessions-bom.csv', $csv);

        $this->actingAs($user)
            ->post(route('sales.import.pos-sessions'), ['file' => $file])
            ->assertRedirect(route('sales.index'));

        $this->assertDatabaseHas('pos_sessions', [
            'session_number' => 'POS-BOM-1',
            'warehouse_id' => $warehouse->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_sales_import_pos_sessions_allows_import_when_user_already_has_open_session(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Infinix SM Kiosk', 1);

        PosSession::create([
            'session_number' => 'POS-EXISTING-OPEN',
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => Carbon::parse('2026-04-25T01:00:00Z'),
            'status' => PosSession::STATUS_OPENED,
        ]);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-NEW-OPEN,,2026-04-25T06:23:28.770Z,,,0,Infinix SM Kiosk,opened,,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z',
        ]);
        $file = UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv);

        $this->actingAs($user)
            ->post(route('sales.import.pos-sessions'), ['file' => $file])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('pos_sessions', [
            'session_number' => 'POS-NEW-OPEN',
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'status' => PosSession::STATUS_OPENED,
        ]);
    }

    public function test_sales_import_pos_sessions_resolves_cashier_name_to_user_id(): void
    {
        $uploader = User::factory()->create();
        $cashier = User::factory()->create(['name' => 'Cashier One']);
        $warehouse = $this->createWarehouse('Cashier Branch', 1);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,cashier_name,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-CASHIER-1,Imported row,2026-04-25T06:23:28.770Z,,,1000,Cashier One,Cashier Branch,opened,Start shift,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z',
        ]);

        $this->actingAs($uploader)
            ->post(route('sales.import.pos-sessions'), ['file' => UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('pos_sessions', [
            'session_number' => 'POS-CASHIER-1',
            'user_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
        ]);
    }

    public function test_sales_import_pos_sessions_uses_uploader_when_cashier_name_blank(): void
    {
        $uploader = User::factory()->create();
        $warehouse = $this->createWarehouse('Fallback Branch', 1);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,cashier_name,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-CASHIER-BLANK,Imported row,2026-04-25T06:23:28.770Z,,,1000,,Fallback Branch,opened,Start shift,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z',
        ]);

        $this->actingAs($uploader)
            ->post(route('sales.import.pos-sessions'), ['file' => UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('pos_sessions', [
            'session_number' => 'POS-CASHIER-BLANK',
            'user_id' => $uploader->id,
            'warehouse_id' => $warehouse->id,
        ]);
    }

    public function test_sales_import_pos_sessions_reports_error_for_unknown_cashier_name(): void
    {
        $uploader = User::factory()->create();
        $this->createWarehouse('Unknown Cashier Branch', 1);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,cashier_name,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-CASHIER-UNKNOWN,Imported row,2026-04-25T06:23:28.770Z,,,1000,Missing Cashier,Unknown Cashier Branch,opened,Start shift,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z',
        ]);

        $response = $this->actingAs($uploader)
            ->post(route('sales.import.pos-sessions'), ['file' => UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv)]);

        $response->assertRedirect(route('sales.index'));
        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('pos_sessions', ['session_number' => 'POS-CASHIER-UNKNOWN']);
        $this->assertStringContainsString("cashier_name 'Missing Cashier' not found", session('import_summary')['error_rows'][0]);
    }

    public function test_sales_import_pos_sessions_reports_error_for_ambiguous_cashier_name(): void
    {
        $uploader = User::factory()->create();
        User::factory()->create(['name' => 'Duplicate Cashier']);
        User::factory()->create(['name' => 'Duplicate Cashier']);
        $this->createWarehouse('Ambiguous Cashier Branch', 1);

        $csv = implode("\n", [
            'session_number,notes,shift_start_time,shift_end_time,closing_balance,opening_balance,cashier_name,warehouse_name,status,cashier_remarks,created_date,updated_date',
            'POS-CASHIER-AMBIGUOUS,Imported row,2026-04-25T06:23:28.770Z,,,1000,Duplicate Cashier,Ambiguous Cashier Branch,opened,Start shift,2026-04-24T22:23:28.357Z,2026-04-24T22:23:28.357Z',
        ]);

        $response = $this->actingAs($uploader)
            ->post(route('sales.import.pos-sessions'), ['file' => UploadedFile::fake()->createWithContent('pos-sessions.csv', $csv)]);

        $response->assertRedirect(route('sales.index'));
        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('pos_sessions', ['session_number' => 'POS-CASHIER-AMBIGUOUS']);
        $this->assertStringContainsString("cashier_name 'Duplicate Cashier' is ambiguous", session('import_summary')['error_rows'][0]);
    }

    public function test_sales_import_transactions_creates_rows_from_valid_csv_and_dedupes_items(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Import Branch', 1);
        $cashier = User::factory()->create();
        $session = PosSession::create([
            'session_number' => 'POS-TXN-1',
            'user_id' => $cashier->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => Carbon::parse('2026-04-25T01:00:00Z'),
            'status' => PosSession::STATUS_OPENED,
        ]);
        $salesRep = $this->createEmployee('Sales Representative');
        $customer = $this->createCustomer('Import', 'Buyer');
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $card = PaymentMethod::create(['name' => 'Credit Card', 'type' => 'card']);
        [$variant] = $this->createProductGraph('Apple', 'iPhone 18', 'APPLE-IPHONE18', [
            ['name' => '256GB Blue', 'sku' => 'APPLE-IPHONE18-256'],
        ]);
        $inventory = $this->createInventoryItem($variant, $warehouse, imei: '359250730563234', cash: 11999, cost: 10120);

        $csv = $this->salesTransactionsCsv([
            [
                'transaction_number' => 'TXN-IMPORT-1',
                'or_number' => 'OR-IMPORT-1',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'transaction_date' => '2026-04-25T06:37:15.048Z',
                'customer_name' => 'Import Buyer',
                'warehouse_name' => 'Import Branch',
                'pos_session_number' => 'POS-TXN-1',
                'sales_representative_name' => 'Sales Representative 001',
                'inventory_identifier' => '359250730563234',
                'unit_price' => '11999',
                'price_basis' => 'cash',
                'snapshot_cash_price' => '11999',
                'snapshot_srp' => '12499',
                'snapshot_cost_price' => '10120',
                'discount_amount' => '0',
                'line_total' => '11999',
                'is_bundle' => 'false',
                'payment_method_name' => 'Cash',
                'amount' => '5000',
                'official_receipt_url' => 'https://example.test/or.jpg',
                'customer_id_url' => 'https://example.test/id.jpg',
            ],
            [
                'transaction_number' => 'TXN-IMPORT-1',
                'or_number' => 'OR-IMPORT-1',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'transaction_date' => '2026-04-25T06:37:15.048Z',
                'customer_name' => 'Import Buyer',
                'warehouse_name' => 'Import Branch',
                'pos_session_number' => 'POS-TXN-1',
                'sales_representative_name' => 'Sales Representative 001',
                'inventory_identifier' => '359250730563234',
                'unit_price' => '11999',
                'price_basis' => 'cash',
                'snapshot_cash_price' => '11999',
                'snapshot_srp' => '12499',
                'snapshot_cost_price' => '10120',
                'discount_amount' => '0',
                'line_total' => '11999',
                'is_bundle' => 'false',
                'payment_method_name' => 'Credit Card',
                'amount' => '6999',
                'reference_number' => 'CC-123',
                'bank' => 'BPI',
                'terminal_used' => 'Terminal 1',
                'card_holder_name' => 'Import Buyer',
                'loan_term_months' => '6',
                'supporting_doc_url' => 'https://example.test/card.jpg',
                'supporting_doc_name' => 'Card Slip',
                'supporting_doc_type' => 'card_slip',
                'official_receipt_url' => 'https://example.test/or.jpg',
                'customer_id_url' => 'https://example.test/id.jpg',
                'customer_agreement_url' => 'https://example.test/agreement.jpg',
                'other_supporting_documents' => 'https://example.test/other.jpg',
            ],
        ]);

        $file = UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => $file])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $transaction = SalesTransaction::where('transaction_number', 'TXN-IMPORT-1')->firstOrFail();
        $this->assertSame('OR-IMPORT-1', $transaction->or_number);
        $this->assertSame((string) $customer->id, (string) $transaction->customer_id);
        $this->assertSame((string) $session->id, (string) $transaction->pos_session_id);
        $this->assertSame((string) $salesRep->id, (string) $transaction->sales_representative_id);
        $this->assertSame(11999.0, (float) $transaction->total_amount);
        $this->assertSame(1, SalesTransactionItem::where('sales_transaction_id', $transaction->id)->count());
        $this->assertSame(2, SalesTransactionPayment::where('sales_transaction_id', $transaction->id)->count());
        $this->assertSame(1, SalesTransactionPaymentDetail::query()->count());
        $this->assertSame(1, SalesTransactionPaymentDocument::query()->count());
        $this->assertSame(4, SalesTransactionDocument::where('sales_transaction_id', $transaction->id)->count());
        $this->assertDatabaseHas('inventory_items', [
            'id' => $inventory->id,
            'status' => 'sold',
        ]);
    }

    public function test_sales_import_transactions_skips_existing_transaction(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Duplicate Branch', 1);
        $cash = PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        $salesRep = $this->createEmployee('Sales Representative');
        $customer = $this->createCustomer('Duplicate', 'Buyer');
        $session = $this->createSession($this->createEmployee('Cashier'), $warehouse);
        [$variant] = $this->createProductGraph('Apple', 'iPhone 19', 'APPLE-IPHONE19', [
            ['name' => '128GB Black', 'sku' => 'APPLE-IPHONE19-128'],
        ]);
        $inventory = $this->createInventoryItem($variant, $warehouse, imei: 'DUP-IMEI-1');
        $this->createTransaction($session, $customer, $inventory, $cash, $salesRep, orNumber: 'OR-DUP-1');
        $existing = SalesTransaction::where('or_number', 'OR-DUP-1')->firstOrFail();

        $csv = $this->salesTransactionsCsv([[
            'transaction_number' => $existing->transaction_number,
            'or_number' => 'OR-DUP-1',
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'transaction_date' => '2026-04-25T06:37:15.048Z',
            'customer_name' => 'Duplicate Buyer',
            'warehouse_name' => 'Duplicate Branch',
            'pos_session_number' => $session->session_number,
            'sales_representative_name' => 'Sales Representative 001',
            'inventory_identifier' => 'DUP-IMEI-1',
            'unit_price' => '10000',
            'price_basis' => 'cash',
            'line_total' => '10000',
            'payment_method_name' => 'Cash',
            'amount' => '10000',
        ]]);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $this->assertSame(1, SalesTransaction::where('or_number', 'OR-DUP-1')->count());
        $summary = session('import_summary');
        $this->assertSame(0, $summary['created']);
        $this->assertSame(1, $summary['skipped']);
    }

    public function test_sales_import_transactions_requires_expected_csv_headers(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->createWithContent('sales-transactions.csv', 'transaction_number,or_number');

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => $file])
            ->assertSessionHasErrors('file');
    }

    public function test_sales_import_transactions_keeps_blank_inventory_as_hard_error(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Inventory Branch', 1);
        PosSession::create([
            'session_number' => 'POS-INV-1',
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => Carbon::parse('2026-04-25T01:00:00Z'),
            'status' => PosSession::STATUS_OPENED,
        ]);
        $this->createEmployee('Sales Representative');
        $this->createCustomer('Inventory', 'Buyer');
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);

        $csv = $this->salesTransactionsCsv([[
            'transaction_number' => 'TXN-MISSING-INV',
            'or_number' => 'OR-MISSING-INV',
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'transaction_date' => '2026-04-25T06:37:15.048Z',
            'customer_name' => 'Inventory Buyer',
            'warehouse_name' => 'Inventory Branch',
            'pos_session_number' => 'POS-INV-1',
            'sales_representative_name' => 'Sales Representative 001',
            'inventory_identifier' => '',
            'unit_price' => '10000',
            'price_basis' => 'cash',
            'line_total' => '10000',
            'payment_method_name' => 'Cash',
            'amount' => '10000',
        ]]);

        $response = $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv)]);

        $response->assertRedirect(route('sales.index'));
        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('sales_transactions', ['transaction_number' => 'TXN-MISSING-INV']);
        $this->assertStringContainsString('inventory_identifier is required', session('import_summary')['error_rows'][0]);
    }

    public function test_sales_import_transactions_soft_skips_unknown_inventory_identifier(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Unknown Inventory Branch', 1);
        PosSession::create([
            'session_number' => 'POS-UNK-INV-1',
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => Carbon::parse('2026-04-25T01:00:00Z'),
            'status' => PosSession::STATUS_OPENED,
        ]);
        $this->createEmployee('Sales Representative');
        $this->createCustomer('Unknown', 'Inventory');
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);

        $csv = $this->salesTransactionsCsv([[
            'transaction_number' => 'TXN-UNK-INV',
            'or_number' => 'OR-UNK-INV',
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'transaction_date' => '2026-04-25T06:37:15.048Z',
            'customer_name' => 'Unknown Inventory',
            'warehouse_name' => 'Unknown Inventory Branch',
            'pos_session_number' => 'POS-UNK-INV-1',
            'sales_representative_name' => 'Sales Representative 001',
            'inventory_identifier' => 'UNKNOWN-INV-IDENTIFIER',
            'unit_price' => '10000',
            'price_basis' => 'cash',
            'line_total' => '10000',
            'payment_method_name' => 'Cash',
            'amount' => '10000',
        ]]);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success')
            ->assertSessionMissing('error');

        $summary = session('import_summary');
        $this->assertSame(0, $summary['created']);
        $this->assertSame(1, $summary['skipped']);
        $this->assertSame(0, $summary['errors']);
        $this->assertSame([], $summary['error_rows']);
        $this->assertDatabaseMissing('sales_transactions', ['transaction_number' => 'TXN-UNK-INV']);
    }

    public function test_sales_import_transactions_skips_missing_lookup_records(): void
    {
        $user = User::factory()->create();
        $csv = $this->salesTransactionsCsv([[
            'transaction_number' => 'TXN-MISSING-LOOKUP',
            'or_number' => 'OR-MISSING-LOOKUP',
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'transaction_date' => '2026-04-25T06:37:15.048Z',
            'customer_name' => 'Missing Buyer',
            'warehouse_name' => 'Missing Branch',
            'pos_session_number' => 'POS-MISSING',
            'sales_representative_name' => 'Missing Rep',
            'inventory_identifier' => 'UNKNOWN',
            'unit_price' => '10000',
            'price_basis' => 'cash',
            'line_total' => '10000',
            'payment_method_name' => 'Cash',
            'amount' => '10000',
        ]]);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success')
            ->assertSessionMissing('error');

        $summary = session('import_summary');
        $this->assertSame(0, $summary['created']);
        $this->assertSame(1, $summary['skipped']);
        $this->assertSame(0, $summary['errors']);
        $this->assertSame([], $summary['error_rows']);
        $this->assertDatabaseMissing('sales_transactions', ['transaction_number' => 'TXN-MISSING-LOOKUP']);
    }

    public function test_sales_import_transactions_imports_valid_subset_when_group_has_disconnected_rows(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('Subset Branch', 1);
        PosSession::create([
            'session_number' => 'POS-SUBSET-1',
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => Carbon::parse('2026-04-25T01:00:00Z'),
            'status' => PosSession::STATUS_OPENED,
        ]);
        $this->createEmployee('Sales Representative');
        $this->createCustomer('Subset', 'Buyer');
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        [$variant] = $this->createProductGraph('Apple', 'iPhone Subset', 'APPLE-IPHONE-SUBSET', [
            ['name' => '128GB', 'sku' => 'APPLE-IPHONE-SUBSET-128'],
        ]);
        $this->createInventoryItem($variant, $warehouse, imei: 'SUBSET-IMEI-1', cash: 7000);

        $csv = $this->salesTransactionsCsv([
            [
                'transaction_number' => 'TXN-SUBSET-1',
                'or_number' => 'OR-SUBSET-1',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'transaction_date' => '2026-04-25T06:37:15.048Z',
                'customer_name' => 'Subset Buyer',
                'warehouse_name' => 'Subset Branch',
                'pos_session_number' => 'POS-SUBSET-1',
                'sales_representative_name' => 'Sales Representative 001',
                'inventory_identifier' => 'SUBSET-IMEI-1',
                'unit_price' => '7000',
                'price_basis' => 'cash',
                'line_total' => '7000',
                'payment_method_name' => 'Cash',
                'amount' => '7000',
            ],
            [
                'transaction_number' => 'TXN-SUBSET-1',
                'or_number' => 'OR-SUBSET-1',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'transaction_date' => '2026-04-25T06:37:15.048Z',
                'customer_name' => 'Subset Buyer',
                'warehouse_name' => 'Subset Branch',
                'pos_session_number' => 'POS-SUBSET-1',
                'sales_representative_name' => 'Sales Representative 001',
                'inventory_identifier' => 'SUBSET-IMEI-1',
                'unit_price' => '3000',
                'price_basis' => 'cash',
                'line_total' => '3000',
                'payment_method_name' => 'Unknown Method',
                'amount' => '3000',
            ],
        ]);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success')
            ->assertSessionMissing('error');

        $summary = session('import_summary');
        $this->assertSame(1, $summary['created']);
        $this->assertSame(1, $summary['skipped']);
        $this->assertSame(0, $summary['errors']);
        $this->assertSame([], $summary['error_rows']);

        $transaction = SalesTransaction::where('transaction_number', 'TXN-SUBSET-1')->firstOrFail();
        $this->assertSame(7000.0, (float) $transaction->total_amount);
        $this->assertSame(1, SalesTransactionPayment::where('sales_transaction_id', $transaction->id)->count());
    }

    public function test_sales_import_transactions_soft_skips_fully_disconnected_group_by_row_count(): void
    {
        $user = User::factory()->create();
        $csv = $this->salesTransactionsCsv([
            [
                'transaction_number' => 'TXN-DISCONNECTED-GROUP',
                'or_number' => 'OR-DISCONNECTED-GROUP',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'transaction_date' => '2026-04-25T06:37:15.048Z',
                'customer_name' => 'Missing Group Buyer',
                'warehouse_name' => 'Missing Group Branch',
                'pos_session_number' => 'POS-MISSING-GROUP',
                'sales_representative_name' => 'Missing Group Rep',
                'inventory_identifier' => 'MISSING-1',
                'unit_price' => '10000',
                'price_basis' => 'cash',
                'line_total' => '10000',
                'payment_method_name' => 'Cash',
                'amount' => '10000',
            ],
            [
                'transaction_number' => 'TXN-DISCONNECTED-GROUP',
                'or_number' => 'OR-DISCONNECTED-GROUP',
                'mode_of_release' => SalesTransaction::MODE_PICKUP,
                'transaction_date' => '2026-04-25T06:37:15.048Z',
                'customer_name' => 'Missing Group Buyer',
                'warehouse_name' => 'Missing Group Branch',
                'pos_session_number' => 'POS-MISSING-GROUP',
                'sales_representative_name' => 'Missing Group Rep',
                'inventory_identifier' => 'MISSING-2',
                'unit_price' => '15000',
                'price_basis' => 'cash',
                'line_total' => '15000',
                'payment_method_name' => 'Cash',
                'amount' => '15000',
            ],
        ]);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success')
            ->assertSessionMissing('error');

        $summary = session('import_summary');
        $this->assertSame(0, $summary['created']);
        $this->assertSame(2, $summary['skipped']);
        $this->assertSame(0, $summary['errors']);
        $this->assertSame([], $summary['error_rows']);
        $this->assertDatabaseMissing('sales_transactions', ['transaction_number' => 'TXN-DISCONNECTED-GROUP']);
    }

    public function test_sales_import_transactions_accepts_utf8_bom_header_csv(): void
    {
        $user = User::factory()->create();
        $warehouse = $this->createWarehouse('BOM Branch', 1);
        PosSession::create([
            'session_number' => 'POS-BOM-TXN',
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => Carbon::parse('2026-04-25T01:00:00Z'),
            'status' => PosSession::STATUS_OPENED,
        ]);
        $this->createEmployee('Sales Representative');
        $this->createCustomer('Bom', 'Buyer');
        PaymentMethod::create(['name' => 'Cash', 'type' => 'cash']);
        [$variant] = $this->createProductGraph('Apple', 'iPhone BOM', 'APPLE-IPHONE-BOM', [
            ['name' => '64GB', 'sku' => 'APPLE-IPHONE-BOM-64'],
        ]);
        $this->createInventoryItem($variant, $warehouse, imei: 'BOM-IMEI-1');

        $csv = $this->salesTransactionsCsv([[
            'transaction_number' => 'TXN-BOM',
            'or_number' => 'OR-BOM',
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'transaction_date' => '2026-04-25T06:37:15.048Z',
            'customer_name' => 'Bom Buyer',
            'warehouse_name' => 'BOM Branch',
            'pos_session_number' => 'POS-BOM-TXN',
            'sales_representative_name' => 'Sales Representative 001',
            'inventory_identifier' => 'BOM-IMEI-1',
            'unit_price' => '10000',
            'price_basis' => 'cash',
            'line_total' => '10000',
            'payment_method_name' => 'Cash',
            'amount' => '10000',
        ]], true);

        $this->actingAs($user)
            ->post(route('sales.import.transactions'), ['file' => UploadedFile::fake()->createWithContent('sales-transactions-bom.csv', $csv)])
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('sales_transactions', ['transaction_number' => 'TXN-BOM']);
    }

    private function createWarehouse(string $name, int $sortOrder): Warehouse
    {
        return Warehouse::create([
            'name' => $name,
            'warehouse_type' => 'store',
            'sort_order' => $sortOrder,
        ]);
    }

    private function createEmployee(string $role): Employee
    {
        $sequence = $this->employeeSequence++;

        return Employee::create([
            'employee_id' => 'EMP-SL-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            'job_title_id' => $this->createJobTitle($role)->id,
            'first_name' => $role,
            'last_name' => str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
            'status' => Employee::STATUS_ACTIVE,
        ]);
    }

    private function createJobTitle(string $name): JobTitle
    {
        $department = Department::firstOrCreate(
            ['name' => 'Operations'],
            ['status' => Department::STATUS_ACTIVE],
        );

        return JobTitle::firstOrCreate(
            ['department_id' => $department->id, 'name' => $name],
            ['status' => JobTitle::STATUS_ACTIVE],
        );
    }

    private function createCustomer(string $firstName, string $lastName, bool $withAddress = false): Customer
    {
        $customer = Customer::create([
            'firstname' => $firstName,
            'lastname' => $lastName,
            'customer_kind' => Customer::KIND_PERSON,
        ]);

        CustomerContact::create([
            'customer_id' => $customer->id,
            'contact_type' => 'mobile',
            'phone' => '09171234567',
            'email' => strtolower($firstName).'.'.strtolower($lastName).'@example.com',
            'is_primary' => true,
        ]);

        if ($withAddress) {
            CustomerAddress::create([
                'customer_id' => $customer->id,
                'address_type' => 'primary',
                'street' => '123 Mabini',
                'barangay' => 'Barangay 1',
                'city_municipality' => 'Manila',
                'province' => 'Metro Manila',
                'region' => 'NCR',
                'country' => 'PH',
                'is_primary' => true,
            ]);
        }

        return $customer;
    }

    private function createSession(Employee $cashier, Warehouse $warehouse): PosSession
    {
        $user = User::factory()->create();

        return PosSession::create([
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => now()->subHours(4),
            'status' => PosSession::STATUS_OPENED,
        ]);
    }

    private function createProductGraph(string $brandName, string $modelName, string $masterSku, array $variantDefinitions): array
    {
        $brand = ProductBrand::firstOrCreate(['name' => $brandName]);
        $category = ProductCategory::firstOrCreate(['name' => 'Phones', 'parent_category_id' => null]);
        $subcategory = ProductCategory::create([
            'name' => $modelName.' Subcategory',
            'parent_category_id' => $category->id,
        ]);
        $model = ProductModel::create([
            'brand_id' => $brand->id,
            'model_name' => $modelName,
        ]);
        $master = ProductMaster::create([
            'master_sku' => $masterSku,
            'model_id' => $model->id,
            'subcategory_id' => $subcategory->id,
            'product_name' => $brandName.' '.$modelName,
        ]);

        $variants = [];
        foreach ($variantDefinitions as $definition) {
            $variants[] = ProductVariant::create([
                'product_master_id' => $master->id,
                'variant_name' => $definition['name'],
                'sku' => $definition['sku'],
                'condition' => $definition['condition'] ?? 'Brand New',
                'is_active' => true,
            ]);
        }

        return [...$variants, $master];
    }

    private function createInventoryItem(
        ProductVariant $variant,
        Warehouse $warehouse,
        ?string $imei = null,
        ?string $serial = null,
        float $cash = 10000,
        float $cost = 7000,
    ): InventoryItem {
        $sequence = $this->inventorySequence++;

        return InventoryItem::create([
            'product_variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'imei' => $imei ?? sprintf('990000000000%03d', $sequence),
            'serial_number' => $serial ?? sprintf('SALES-%03d', $sequence),
            'status' => 'sold',
            'cost_price' => $cost,
            'cash_price' => $cash,
            'srp_price' => $cash + 500,
            'warranty' => '30 days service warranty',
        ]);
    }

    private function createTransaction(
        PosSession $session,
        Customer $customer,
        InventoryItem $inventoryItem,
        PaymentMethod $paymentMethod,
        Employee $salesRep,
        ?Carbon $createdAt = null,
        ?string $orNumber = null,
        array $detail = [],
    ): SalesTransaction {
        $sequence = $this->transactionSequence++;
        $createdAt ??= now();

        $transaction = SalesTransaction::create([
            'customer_id' => $customer->id,
            'pos_session_id' => $session->id,
            'sales_representative_id' => $salesRep->id,
            'or_number' => $orNumber ?? 'OR-'.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT),
            'mode_of_release' => SalesTransaction::MODE_PICKUP,
            'total_amount' => $inventoryItem->cash_price,
        ]);

        $transaction->timestamps = false;
        $transaction->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        SalesTransactionItem::create([
            'sales_transaction_id' => $transaction->id,
            'inventory_item_id' => $inventoryItem->id,
            'price_basis' => SalesTransactionItem::PRICE_BASIS_CASH,
            'snapshot_cash_price' => $inventoryItem->cash_price,
            'snapshot_srp' => $inventoryItem->srp_price,
            'snapshot_cost_price' => $inventoryItem->cost_price,
            'discount_amount' => 0,
            'line_total' => $inventoryItem->cash_price,
            'is_bundle' => false,
        ]);

        $payment = SalesTransactionPayment::create([
            'sales_transaction_id' => $transaction->id,
            'payment_method_id' => $paymentMethod->id,
            'amount' => $inventoryItem->cash_price,
        ]);

        if ($detail !== []) {
            SalesTransactionPaymentDetail::create([
                'sales_transaction_payment_id' => $payment->id,
                'reference_number' => $detail['reference_number'] ?? null,
                'bank' => $detail['bank'] ?? null,
                'loan_term_months' => $detail['loan_term_months'] ?? null,
            ]);
        }

        return $transaction->fresh();
    }

    private function createCustomerDefaults(): void
    {
        CustomerGroup::firstOrCreate(['name' => 'Walk-in']);
        CustomerType::firstOrCreate(['name' => 'retail']);
    }

    private function salesTransactionsCsv(array $rows, bool $bom = false): string
    {
        $headers = [
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

        $lines = [($bom ? "\xEF\xBB\xBF" : '').implode(',', $headers)];
        foreach ($rows as $row) {
            $values = [];
            foreach ($headers as $header) {
                $value = (string) ($row[$header] ?? '');
                $values[] = str_contains($value, ',') ? '"'.str_replace('"', '""', $value).'"' : $value;
            }
            $lines[] = implode(',', $values);
        }

        return implode("\n", $lines);
    }
}
