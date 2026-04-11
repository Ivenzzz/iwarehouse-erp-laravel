<?php

namespace App\Features\Pos\Support;

use App\Models\Employee;
use App\Models\User;

class ResolvesCashier
{
    public function resolve(User $user): array
    {
        $employee = $this->resolveEmployee($user);

        if ($employee === null) {
            return [
                'user' => $user,
                'employee' => null,
                'error' => 'No employee account link matched the authenticated user. Link this account to an employee before using POS.',
            ];
        }

        return [
            'user' => $user,
            'employee' => $employee,
            'error' => null,
        ];
    }

    private function resolveEmployee(User $user): ?Employee
    {
        return $user->employeeAccount()
            ->with('employee.jobTitle.department')
            ->first()
            ?->employee;
    }
}
