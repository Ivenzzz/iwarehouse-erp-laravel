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
                'error' => 'No employee record matched the authenticated user. Match by email or full name before using POS.',
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
        if (filled($user->email)) {
            $employee = Employee::query()
                ->where('email', $user->email)
                ->first();

            if ($employee !== null) {
                return $employee;
            }
        }

        [$firstName, $lastName] = $this->splitName($user->name);

        if ($firstName === null || $lastName === null) {
            return null;
        }

        return Employee::query()
            ->where('first_name', $firstName)
            ->where('last_name', $lastName)
            ->first();
    }

    private function splitName(?string $name): array
    {
        $segments = preg_split('/\s+/', trim((string) $name)) ?: [];
        $segments = array_values(array_filter($segments));

        if (count($segments) < 2) {
            return [null, null];
        }

        return [$segments[0], $segments[count($segments) - 1]];
    }
}
