<?php

namespace App\Features\Employees\Queries;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use Illuminate\Http\Request;

class ListEmployees
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['employee_code', 'firstname', 'lastname', 'department_name', 'job_title'], true)
            ? $request->query('sort')
            : 'employee_code';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $query = Employee::query()
            ->with('jobTitle.department')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('employee_id', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhereHas('jobTitle', function ($query) use ($search) {
                            $query
                                ->where('name', 'like', "%{$search}%")
                                ->orWhereHas('department', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                        });
                });
            });

        match ($sort) {
            'department_name' => $query
                ->leftJoin('job_titles', 'job_titles.id', '=', 'employees.job_title_id')
                ->leftJoin('departments', 'departments.id', '=', 'job_titles.department_id')
                ->select('employees.*')
                ->orderBy('departments.name', $direction),
            'job_title' => $query
                ->leftJoin('job_titles', 'job_titles.id', '=', 'employees.job_title_id')
                ->select('employees.*')
                ->orderBy('job_titles.name', $direction),
            'employee_code' => $query->orderBy('employees.employee_id', $direction),
            'firstname' => $query->orderBy('employees.first_name', $direction),
            'lastname' => $query->orderBy('employees.last_name', $direction),
            default => $query->orderBy('employees.employee_id', 'asc'),
        };

        $employees = $query
            ->orderBy('employees.id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Employee $employee) => [
                'id' => $employee->id,
                'employee_code' => $employee->employee_id,
                'firstname' => $employee->first_name,
                'lastname' => $employee->last_name,
                'full_name' => trim($employee->first_name.' '.$employee->last_name),
                'department_name' => $employee->jobTitle?->department?->name,
                'job_title' => $employee->jobTitle?->name,
                'created_at' => optional($employee->created_at)?->toDateTimeString(),
                'updated_at' => optional($employee->updated_at)?->toDateTimeString(),
            ]);

        return [
            'employees' => $employees,
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'jobTitles' => JobTitle::query()->orderBy('name')->get(['id', 'name', 'department_id']),
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }
}
