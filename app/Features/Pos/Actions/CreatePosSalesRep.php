<?php

namespace App\Features\Pos\Actions;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use InvalidArgumentException;

class CreatePosSalesRep
{
    public function handle(string $firstName, string $lastName): Employee
    {
        $department = Department::query()
            ->whereRaw('LOWER(name) = ?', ['sales'])
            ->first();

        if ($department === null) {
            throw new InvalidArgumentException('Sales department is not configured.');
        }

        $jobTitle = JobTitle::query()
            ->where('department_id', $department->id)
            ->where('status', JobTitle::STATUS_ACTIVE)
            ->orderBy('name')
            ->first();

        if ($jobTitle === null) {
            throw new InvalidArgumentException('No active Sales job title is configured.');
        }

        return Employee::create([
            'employee_id' => $this->nextEmployeeCode(),
            'job_title_id' => $jobTitle->id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'status' => Employee::STATUS_ACTIVE,
        ])->fresh('jobTitle.department');
    }

    private function nextEmployeeCode(): string
    {
        $latest = Employee::query()
            ->where('employee_id', 'like', 'EMP-%')
            ->orderByDesc('id')
            ->value('employee_id');

        if (! is_string($latest) || ! preg_match('/(\d+)$/', $latest, $matches)) {
            return 'EMP-000001';
        }

        return sprintf('EMP-%06d', ((int) $matches[1]) + 1);
    }
}
