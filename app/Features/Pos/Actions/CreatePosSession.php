<?php

namespace App\Features\Pos\Actions;

use App\Models\Employee;
use App\Models\PosSession;

class CreatePosSession
{
    public function handle(Employee $employee, int $warehouseId, float $openingBalance): PosSession
    {
        return PosSession::create([
            'employee_id' => $employee->id,
            'warehouse_id' => $warehouseId,
            'opening_balance' => $openingBalance,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);
    }
}
