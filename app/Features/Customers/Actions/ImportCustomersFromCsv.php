<?php

namespace App\Features\Customers\Actions;

use App\Models\Customer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportCustomersFromCsv
{
    private const REQUIRED_HEADERS = [
        'customer_code',
        'firstname',
        'lastname',
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
                    'file' => 'The CSV must include Customer Code, Firstname, and Lastname headers.',
                ]);
            }
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $rows = [];
        $seenCustomerCodes = [];
        $duplicateCsvRows = 0;
        $invalidCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            $data = [];

            foreach (self::REQUIRED_HEADERS as $header) {
                $data[$header] = trim((string) ($row[$headerMap[$header]] ?? ''));
            }

            if (collect($data)->every(fn (string $value) => $value === '')) {
                continue;
            }

            if ($data['customer_code'] === '' || $data['firstname'] === '' || $data['lastname'] === '') {
                $invalidCsvRows++;
                continue;
            }

            if (Str::length($data['customer_code']) > 20) {
                $invalidCsvRows++;
                continue;
            }

            foreach (['firstname', 'lastname'] as $field) {
                if (Str::length($data[$field]) > 100) {
                    $invalidCsvRows++;
                    continue 2;
                }
            }

            $normalizedCustomerCode = Str::lower($data['customer_code']);
            if (isset($seenCustomerCodes[$normalizedCustomerCode])) {
                $duplicateCsvRows++;
                continue;
            }
            $seenCustomerCodes[$normalizedCustomerCode] = true;

            $rows[] = $data;
        }

        fclose($handle);

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows, $invalidCsvRows) {
            $summary = [
                'customers_created' => 0,
                'customers_skipped' => $duplicateCsvRows + $invalidCsvRows,
            ];

            foreach ($rows as $row) {
                $exists = Customer::query()
                    ->whereRaw('LOWER(customer_code) = ?', [Str::lower($row['customer_code'])])
                    ->exists();

                if ($exists) {
                    $summary['customers_skipped']++;
                    continue;
                }

                Customer::create([
                    'customer_code' => $row['customer_code'],
                    'customer_kind' => Customer::KIND_PERSON,
                    'firstname' => $row['firstname'],
                    'lastname' => $row['lastname'],
                ]);

                $summary['customers_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['customers_created']} customer(s) created; {$summary['customers_skipped']} existing, duplicate, or invalid customer row(s) skipped.";
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
