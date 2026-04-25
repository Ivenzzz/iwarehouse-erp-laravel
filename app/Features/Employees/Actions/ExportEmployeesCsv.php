<?php

namespace App\Features\Employees\Actions;

use App\Models\Employee;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportEmployeesCsv
{
    public const HEADERS = [
        'Employee Code',
        'Firstname',
        'Lastname',
        'Department Name',
        'JobTitle',
    ];

    public function handle(): StreamedResponse
    {
        $employees = Employee::query()
            ->with('jobTitle.department')
            ->orderBy('employee_id')
            ->get();

        $callback = function () use ($employees): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, self::HEADERS);

            foreach ($employees as $employee) {
                fputcsv($stream, [
                    $employee->employee_id,
                    $employee->first_name,
                    $employee->last_name,
                    $employee->jobTitle?->department?->name,
                    $employee->jobTitle?->name,
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'employees.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
