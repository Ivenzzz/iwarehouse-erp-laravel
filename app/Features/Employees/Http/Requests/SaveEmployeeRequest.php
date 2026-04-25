<?php

namespace App\Features\Employees\Http\Requests;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_code' => [
                'required',
                'string',
                'max:30',
                Rule::unique('employees', 'employee_id')->ignore($this->employee()?->id),
            ],
            'firstname' => ['required', 'string', 'max:100'],
            'lastname' => ['required', 'string', 'max:100'],
            'department_name' => ['required', 'string', 'max:150'],
            'job_title' => ['required', 'string', 'max:150'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $employee = $this->employee();
            $employeeCode = Str::lower(trim((string) $this->input('employee_code')));

            if ($employeeCode === '') {
                return;
            }

            $exists = Employee::query()
                ->whereRaw('LOWER(employee_id) = ?', [$employeeCode])
                ->when($employee !== null, fn ($query) => $query->whereKeyNot($employee->id))
                ->exists();

            if ($exists) {
                $validator->errors()->add('employee_code', 'The employee code has already been taken.');
            }
        });
    }

    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'employee_code' => trim($validated['employee_code']),
            'firstname' => trim($validated['firstname']),
            'lastname' => trim($validated['lastname']),
            'department_name' => trim($validated['department_name']),
            'job_title' => trim($validated['job_title']),
        ];
    }

    private function employee(): ?Employee
    {
        $employee = $this->route('employee');

        return $employee instanceof Employee ? $employee : null;
    }
}
