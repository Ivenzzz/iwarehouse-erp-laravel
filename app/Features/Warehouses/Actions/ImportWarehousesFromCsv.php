<?php

namespace App\Features\Warehouses\Actions;

use App\Models\Warehouse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportWarehousesFromCsv
{
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
        $requiredHeaders = ['name', 'warehouse_type', 'phone_number', 'email', 'street', 'city', 'province', 'zip_code', 'country', 'latitude', 'longitude', 'sort_order'];

        foreach ($requiredHeaders as $requiredHeader) {
            if (! $normalizedHeaders->contains($requiredHeader)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => 'The CSV must include Name, Warehouse Type, Phone Number, Email, Street, City, Province, Zip Code, Country, Latitude, Longitude, and Sort Order headers.',
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

            $warehouse = [
                'name' => trim((string) ($row[$headerMap['name']] ?? '')),
                'warehouse_type' => trim((string) ($row[$headerMap['warehouse_type']] ?? '')),
                'phone_number' => trim((string) ($row[$headerMap['phone_number']] ?? '')),
                'email' => trim((string) ($row[$headerMap['email']] ?? '')),
                'street' => trim((string) ($row[$headerMap['street']] ?? '')),
                'city' => trim((string) ($row[$headerMap['city']] ?? '')),
                'province' => trim((string) ($row[$headerMap['province']] ?? '')),
                'zip_code' => trim((string) ($row[$headerMap['zip_code']] ?? '')),
                'country' => trim((string) ($row[$headerMap['country']] ?? '')),
                'latitude' => trim((string) ($row[$headerMap['latitude']] ?? '')),
                'longitude' => trim((string) ($row[$headerMap['longitude']] ?? '')),
                'sort_order' => trim((string) ($row[$headerMap['sort_order']] ?? '')),
            ];

            if (collect($warehouse)->every(fn ($value) => $value === '')) {
                continue;
            }

            if ($warehouse['name'] === '') {
                $errors['file'][] = "Row {$rowNumber}: Name is required.";
                continue;
            }

            if (Str::length($warehouse['name']) > 150) {
                $errors['file'][] = "Row {$rowNumber}: Name may not be greater than 150 characters.";
                continue;
            }

            if (! in_array($warehouse['warehouse_type'], Warehouse::TYPES, true)) {
                $errors['file'][] = "Row {$rowNumber}: Warehouse Type must be one of ".implode(', ', Warehouse::TYPES).'.';
                continue;
            }

            if ($warehouse['email'] !== '' && ! filter_var($warehouse['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['file'][] = "Row {$rowNumber}: Email must be a valid email address.";
                continue;
            }

            if ($warehouse['latitude'] !== '' && ! is_numeric($warehouse['latitude'])) {
                $errors['file'][] = "Row {$rowNumber}: Latitude must be a number.";
                continue;
            }

            if ($warehouse['longitude'] !== '' && ! is_numeric($warehouse['longitude'])) {
                $errors['file'][] = "Row {$rowNumber}: Longitude must be a number.";
                continue;
            }

            if ($warehouse['sort_order'] !== '' && (! ctype_digit(ltrim($warehouse['sort_order'], '+')) || (int) $warehouse['sort_order'] < 0)) {
                $errors['file'][] = "Row {$rowNumber}: Sort Order must be a non-negative integer.";
                continue;
            }

            $dedupeKey = Str::lower($warehouse['name']);

            if (isset($seenRows[$dedupeKey])) {
                $duplicateCsvRows++;
                continue;
            }

            $seenRows[$dedupeKey] = true;
            $rows[] = [
                'name' => $warehouse['name'],
                'warehouse_type' => $warehouse['warehouse_type'],
                'phone_number' => $warehouse['phone_number'] !== '' ? $warehouse['phone_number'] : null,
                'email' => $warehouse['email'] !== '' ? $warehouse['email'] : null,
                'street' => $warehouse['street'] !== '' ? $warehouse['street'] : null,
                'city' => $warehouse['city'] !== '' ? $warehouse['city'] : null,
                'province' => $warehouse['province'] !== '' ? $warehouse['province'] : null,
                'zip_code' => $warehouse['zip_code'] !== '' ? $warehouse['zip_code'] : null,
                'country' => $warehouse['country'] !== '' ? $warehouse['country'] : 'PH',
                'latitude' => $warehouse['latitude'] !== '' ? (float) $warehouse['latitude'] : null,
                'longitude' => $warehouse['longitude'] !== '' ? (float) $warehouse['longitude'] : null,
                'sort_order' => $warehouse['sort_order'] !== '' ? (int) $warehouse['sort_order'] : 0,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'warehouses_created' => 0,
                'warehouses_skipped' => $duplicateCsvRows,
            ];

            foreach ($rows as $row) {
                $existing = Warehouse::query()
                    ->whereRaw('LOWER(name) = ?', [Str::lower($row['name'])])
                    ->first();

                if ($existing !== null) {
                    $summary['warehouses_skipped']++;
                    continue;
                }

                Warehouse::create($row);
                $summary['warehouses_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['warehouses_created']} warehouse(s) created; {$summary['warehouses_skipped']} existing or duplicate warehouse row(s) skipped.";
    }
}
