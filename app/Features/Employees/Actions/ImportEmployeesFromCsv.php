<?php

namespace App\Features\Employees\Actions;

use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportEmployeesFromCsv
{
    private const REQUIRED_HEADERS = [
        'employee_code',
        'firstname',
        'lastname',
        'department_name',
        'jobtitle',
    ];

    public function handle(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'The CSV file could not be opened.']);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'The CSV file is empty.']);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => $this->normalizeHeader((string) $header))
            ->values();

        foreach (self::REQUIRED_HEADERS as $requiredHeader) {
            if (! $normalizedHeaders->contains($requiredHeader)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => 'The CSV must include Employee Code, Firstname, Lastname, Department Name, and JobTitle headers.',
                ]);
            }
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $rows = [];
        $errors = [];
        $duplicateCsvRows = 0;
        $seenEmployeeCodes = [];

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $employee = [
                'employee_code' => trim((string) ($row[$headerMap['employee_code']] ?? '')),
                'firstname' => trim((string) ($row[$headerMap['firstname']] ?? '')),
                'lastname' => trim((string) ($row[$headerMap['lastname']] ?? '')),
                'department_name' => trim((string) ($row[$headerMap['department_name']] ?? '')),
                'job_title' => trim((string) ($row[$headerMap['jobtitle']] ?? '')),
            ];

            if (collect($employee)->every(fn (string $value) => $value === '')) {
                continue;
            }

            if ($employee['employee_code'] === '') {
                $errors['file'][] = "Row {$rowNumber}: Employee Code is required.";
                continue;
            }

            if ($employee['firstname'] === '') {
                $errors['file'][] = "Row {$rowNumber}: Firstname is required.";
                continue;
            }

            if ($employee['lastname'] === '') {
                $errors['file'][] = "Row {$rowNumber}: Lastname is required.";
                continue;
            }

            if ($employee['department_name'] === '') {
                $errors['file'][] = "Row {$rowNumber}: Department Name is required.";
                continue;
            }

            if ($employee['job_title'] === '') {
                $errors['file'][] = "Row {$rowNumber}: JobTitle is required.";
                continue;
            }

            if (Str::length($employee['employee_code']) > 30) {
                $errors['file'][] = "Row {$rowNumber}: Employee Code may not be greater than 30 characters.";
                continue;
            }

            if (Str::length($employee['firstname']) > 100) {
                $errors['file'][] = "Row {$rowNumber}: Firstname may not be greater than 100 characters.";
                continue;
            }

            if (Str::length($employee['lastname']) > 100) {
                $errors['file'][] = "Row {$rowNumber}: Lastname may not be greater than 100 characters.";
                continue;
            }

            if (Str::length($employee['department_name']) > 150) {
                $errors['file'][] = "Row {$rowNumber}: Department Name may not be greater than 150 characters.";
                continue;
            }

            if (Str::length($employee['job_title']) > 150) {
                $errors['file'][] = "Row {$rowNumber}: JobTitle may not be greater than 150 characters.";
                continue;
            }

            $dedupeKey = Str::lower($employee['employee_code']);

            if (isset($seenEmployeeCodes[$dedupeKey])) {
                $duplicateCsvRows++;
                continue;
            }

            $seenEmployeeCodes[$dedupeKey] = true;
            $rows[] = $employee;
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'employees_created' => 0,
                'employees_skipped' => $duplicateCsvRows,
            ];

            foreach ($rows as $row) {
                $exists = Employee::query()
                    ->whereRaw('LOWER(employee_id) = ?', [Str::lower($row['employee_code'])])
                    ->exists();

                if ($exists) {
                    $summary['employees_skipped']++;
                    continue;
                }

                $department = $this->findOrCreateDepartment($row['department_name']);
                $jobTitle = $this->findOrCreateJobTitle($department->id, $row['job_title']);

                Employee::create([
                    'employee_id' => $row['employee_code'],
                    'first_name' => $row['firstname'],
                    'last_name' => $row['lastname'],
                    'job_title_id' => $jobTitle->id,
                    'status' => Employee::STATUS_ACTIVE,
                ]);

                $summary['employees_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['employees_created']} employee(s) created; {$summary['employees_skipped']} existing or duplicate employee row(s) skipped.";
    }

    private function findOrCreateDepartment(string $name): Department
    {
        $normalizedName = Str::lower(trim($name));

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
        $normalizedName = Str::lower(trim($name));

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

    private function normalizeHeader(string $header): string
    {
        return (string) Str::of($header)
            ->replace("\u{FEFF}", '')
            ->trim()
            ->lower()
            ->replaceMatches('/[\s_]+/', '_');
    }
}
