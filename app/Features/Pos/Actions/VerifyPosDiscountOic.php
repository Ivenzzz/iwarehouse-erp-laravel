<?php

namespace App\Features\Pos\Actions;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
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
            ->with('jobTitle.department')
            ->where('status', Employee::STATUS_ACTIVE)
            ->whereNotNull('oic_password_hash')
            ->whereHas('jobTitle', function ($query): void {
                $query
                    ->where('status', JobTitle::STATUS_ACTIVE)
                    ->whereRaw('LOWER(name) like ?', ['%oic%'])
                    ->whereHas('department', function ($departmentQuery): void {
                        $departmentQuery
                            ->where('status', Department::STATUS_ACTIVE)
                            ->whereRaw('LOWER(name) = ?', ['sales']);
                    });
            })
            ->get()
            ->first(fn (Employee $employee) => Hash::check($normalizedPin, $employee->oic_password_hash ?? ''));
    }
}
