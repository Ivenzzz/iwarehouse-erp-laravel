<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use App\Models\PosSession;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

class PosSessionsSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_sessions_table_is_created(): void
    {
        $this->assertTrue(Schema::hasTable('pos_sessions'));
    }

    public function test_session_number_is_auto_generated_and_unique(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouse = $this->createWarehouse('Store A');

        $first = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
            'status' => PosSession::STATUS_CLOSED,
            'closing_balance' => 1200,
            'shift_end_time' => '2026-04-09 17:00:00',
        ]);

        $second = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1500,
            'shift_start_time' => '2026-04-10 08:00:00',
        ]);

        $this->assertSame('PSS-000001', $first->session_number);
        $this->assertSame('PSS-000002', $second->session_number);
    }

    public function test_opened_session_requires_employee_warehouse_opening_balance_and_shift_start_time(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouse = $this->createWarehouse('Store A');

        $this->expectException(InvalidArgumentException::class);

        PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
        ]);
    }

    public function test_opened_session_can_leave_close_out_fields_null(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouse = $this->createWarehouse('Store A');

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
        ]);

        $this->assertNull($session->closing_balance);
        $this->assertNull($session->shift_end_time);
        $this->assertNull($session->cashier_remarks);
        $this->assertSame(PosSession::STATUS_OPENED, $session->status);
    }

    public function test_employee_and_warehouse_deletes_are_blocked_while_session_exists(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouse = $this->createWarehouse('Store A');

        PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
        ]);

        $this->assertFalse($this->canDelete(fn () => $employee->delete()));
        $this->assertFalse($this->canDelete(fn () => $warehouse->delete()));
    }

    public function test_only_one_opened_session_per_employee_is_allowed(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouseA = $this->createWarehouse('Store A');
        $warehouseB = $this->createWarehouse('Store B');

        PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouseA->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
        ]);

        $this->expectException(InvalidArgumentException::class);

        PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouseB->id,
            'opening_balance' => 2000,
            'shift_start_time' => '2026-04-09 09:00:00',
        ]);
    }

    public function test_closed_session_can_store_close_out_fields(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouse = $this->createWarehouse('Store A');

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
            'status' => PosSession::STATUS_CLOSED,
            'closing_balance' => 1250.5,
            'shift_end_time' => '2026-04-09 17:00:00',
            'cashier_remarks' => 'Turnover complete.',
        ]);

        $this->assertDatabaseHas('pos_sessions', [
            'id' => $session->id,
            'status' => PosSession::STATUS_CLOSED,
            'cashier_remarks' => 'Turnover complete.',
        ]);
    }

    public function test_pos_session_model_resolves_employee_and_warehouse(): void
    {
        $employee = $this->createEmployee('EMP-0001');
        $warehouse = $this->createWarehouse('Main Store');

        $session = PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
        ]);

        $session->load(['employee', 'warehouse']);

        $this->assertSame('EMP-0001', $session->employee->employee_id);
        $this->assertSame('Main Store', $session->warehouse->name);
    }

    public function test_duplicate_session_number_is_rejected(): void
    {
        $employeeA = $this->createEmployee('EMP-0001');
        $employeeB = $this->createEmployee('EMP-0002');
        $warehouse = $this->createWarehouse('Store A');

        PosSession::create([
            'employee_id' => $employeeA->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 1000,
            'shift_start_time' => '2026-04-09 08:00:00',
            'status' => PosSession::STATUS_CLOSED,
            'closing_balance' => 1100,
            'shift_end_time' => '2026-04-09 17:00:00',
        ]);

        $this->expectException(QueryException::class);

        DB::table('pos_sessions')->insert([
            'session_number' => 'PSS-000001',
            'employee_id' => $employeeB->id,
            'warehouse_id' => $warehouse->id,
            'opening_balance' => 900,
            'closing_balance' => null,
            'shift_start_time' => '2026-04-10 08:00:00',
            'shift_end_time' => null,
            'status' => PosSession::STATUS_OPENED,
            'cashier_remarks' => null,
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createEmployee(string $employeeCode): Employee
    {
        $department = Department::create(['name' => 'Sales '.$employeeCode]);
        $jobTitle = JobTitle::create([
            'department_id' => $department->id,
            'name' => 'Cashier '.$employeeCode,
        ]);

        return Employee::create([
            'employee_id' => $employeeCode,
            'job_title_id' => $jobTitle->id,
            'first_name' => 'Test',
            'last_name' => 'Employee',
        ]);
    }

    private function createWarehouse(string $name): Warehouse
    {
        return Warehouse::create([
            'name' => $name,
            'warehouse_type' => 'store',
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
