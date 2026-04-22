<?php

namespace App\Features\Pos\Actions;

use App\Models\Employee;
use Illuminate\Support\Facades\Hash;

class VerifyPosDiscountOic
{
    public function handle(string $pin): ?Employee
    {
        $normalizedPin = trim($pin);

        if ($normalizedPin === '') {
            return null;
        }

        return Employee::query()
            // Temporary override: accept any active employee with an OIC password hash.
            ->where('status', Employee::STATUS_ACTIVE)
            ->whereNotNull('oic_password_hash')
            ->get()
            ->first(fn (Employee $employee) => Hash::check($normalizedPin, $employee->oic_password_hash ?? ''));
    }
}
