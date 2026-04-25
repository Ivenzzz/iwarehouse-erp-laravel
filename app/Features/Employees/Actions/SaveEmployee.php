<?php

namespace App\Features\Employees\Actions;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use Illuminate\Support\Facades\DB;

class SaveEmployee
{
    public function handle(array $payload, ?Employee $employee = null): Employee
    {
        return DB::transaction(function () use ($payload, $employee) {
            $department = $this->findOrCreateDepartment($payload['department_name']);
            $jobTitle = $this->findOrCreateJobTitle($department->id, $payload['job_title']);

            $employeePayload = [
                'employee_id' => $payload['employee_code'],
                'first_name' => $payload['firstname'],
                'last_name' => $payload['lastname'],
                'job_title_id' => $jobTitle->id,
            ];

            if ($employee === null) {
                $employeePayload['status'] = Employee::STATUS_ACTIVE;
                $employee = Employee::create($employeePayload);
            } else {
                $employee->update($employeePayload);
            }

            return $employee->fresh('jobTitle.department');
        });
    }

    private function findOrCreateDepartment(string $name): Department
    {
        $normalizedName = mb_strtolower(trim($name));

        $existing = Department::query()
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        return Department::create([
            'name' => trim($name),
            'status' => Department::STATUS_ACTIVE,
        ]);
    }

    private function findOrCreateJobTitle(int $departmentId, string $name): JobTitle
    {
        $normalizedName = mb_strtolower(trim($name));

        $existing = JobTitle::query()
            ->where('department_id', $departmentId)
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        return JobTitle::create([
            'department_id' => $departmentId,
            'name' => trim($name),
            'status' => JobTitle::STATUS_ACTIVE,
        ]);
    }
}
