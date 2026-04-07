<?php

namespace App\Features\Suppliers\Actions;

use App\Models\Supplier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportSuppliersFromCsv
{
    use GeneratesSupplierCodes;

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
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->replace(' ', '_')->value())
            ->values();
        $requiredHeaders = ['legal_business_name', 'trade_name', 'address', 'email', 'mobile'];

        foreach ($requiredHeaders as $requiredHeader) {
            if (! $normalizedHeaders->contains($requiredHeader)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => 'The CSV must include Legal Business Name, Trade Name, Address, Email, and Mobile headers.',
                ]);
            }
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];
        $rows = [];
        $seenRows = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $legalBusinessName = trim((string) ($row[$headerMap['legal_business_name']] ?? ''));
            $tradeName = trim((string) ($row[$headerMap['trade_name']] ?? ''));
            $address = trim((string) ($row[$headerMap['address']] ?? ''));
            $email = trim((string) ($row[$headerMap['email']] ?? ''));
            $mobile = trim((string) ($row[$headerMap['mobile']] ?? ''));

            if ($legalBusinessName === '' && $tradeName === '' && $address === '' && $email === '' && $mobile === '') {
                continue;
            }

            if ($legalBusinessName === '') {
                $errors['file'][] = "Row {$rowNumber}: Legal Business Name is required.";
                continue;
            }

            if (Str::length($legalBusinessName) > 150) {
                $errors['file'][] = "Row {$rowNumber}: Legal Business Name may not be greater than 150 characters.";
                continue;
            }

            if (Str::length($tradeName) > 150) {
                $errors['file'][] = "Row {$rowNumber}: Trade Name may not be greater than 150 characters.";
                continue;
            }

            if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors['file'][] = "Row {$rowNumber}: Email must be a valid email address.";
                continue;
            }

            if (Str::length($email) > 150) {
                $errors['file'][] = "Row {$rowNumber}: Email may not be greater than 150 characters.";
                continue;
            }

            if (Str::length($mobile) > 50) {
                $errors['file'][] = "Row {$rowNumber}: Mobile may not be greater than 50 characters.";
                continue;
            }

            $dedupeKey = Str::lower($legalBusinessName);

            if (isset($seenRows[$dedupeKey])) {
                $duplicateCsvRows++;
                continue;
            }

            $seenRows[$dedupeKey] = true;
            $rows[] = [
                'legal_business_name' => $legalBusinessName,
                'trade_name' => $tradeName !== '' ? $tradeName : null,
                'address' => $address !== '' ? $address : null,
                'email' => $email !== '' ? $email : null,
                'mobile' => $mobile !== '' ? $mobile : null,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'suppliers_created' => 0,
                'suppliers_skipped' => $duplicateCsvRows,
            ];

            foreach ($rows as $row) {
                $existing = Supplier::query()
                    ->whereRaw('LOWER(legal_business_name) = ?', [Str::lower($row['legal_business_name'])])
                    ->first();

                if ($existing !== null) {
                    $summary['suppliers_skipped']++;
                    continue;
                }

                $supplier = Supplier::create([
                    'supplier_code' => $this->nextSupplierCode(),
                    'legal_business_name' => $row['legal_business_name'],
                    'trade_name' => $row['trade_name'],
                    'address' => $row['address'],
                    'status' => 'Active',
                ]);

                $supplier->contact()->create([
                    'email' => $row['email'],
                    'mobile' => $row['mobile'],
                ]);

                $summary['suppliers_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['suppliers_created']} supplier(s) created; {$summary['suppliers_skipped']} existing or duplicate supplier row(s) skipped.";
    }
}
