<?php

namespace App\Features\PaymentMethods\Actions;

use App\Models\PaymentMethod;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportPaymentMethodsFromCsv
{
    public function handle(UploadedFile $file): string
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => 'The CSV file could not be opened.',
            ]);
        }

        $headers = fgetcsv($handle);

        if ($headers === false) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV file is empty.',
            ]);
        }

        $normalizedHeaders = collect($headers)
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->value())
            ->values();

        if (! $normalizedHeaders->contains('name') || ! $normalizedHeaders->contains('type') || ! $normalizedHeaders->contains('logo')) {
            fclose($handle);

            throw ValidationException::withMessages([
                'file' => 'The CSV must include name, type, and logo headers.',
            ]);
        }

        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];
        $rows = [];
        $seenRows = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $name = trim((string) ($row[$headerMap['name']] ?? ''));
            $type = trim((string) ($row[$headerMap['type']] ?? ''));
            $logo = trim((string) ($row[$headerMap['logo']] ?? ''));

            if ($name === '' && $type === '' && $logo === '') {
                continue;
            }

            if ($name === '') {
                $errors['file'][] = "Row {$rowNumber}: name is required.";

                continue;
            }

            if ($type === '') {
                $errors['file'][] = "Row {$rowNumber}: type is required.";

                continue;
            }

            if (Str::length($name) > 150) {
                $errors['file'][] = "Row {$rowNumber}: name may not be greater than 150 characters.";

                continue;
            }

            if (! in_array($type, PaymentMethod::TYPES, true)) {
                $errors['file'][] = "Row {$rowNumber}: type must be one of ".implode(', ', PaymentMethod::TYPES).'.';

                continue;
            }

            if (Str::length($logo) > 255) {
                $errors['file'][] = "Row {$rowNumber}: logo may not be greater than 255 characters.";

                continue;
            }

            $dedupeKey = Str::lower($name);

            if (isset($seenRows[$dedupeKey])) {
                $duplicateCsvRows++;

                continue;
            }

            $seenRows[$dedupeKey] = true;
            $rows[] = [
                'name' => $name,
                'type' => $type,
                'logo' => $logo !== '' ? $logo : null,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'created' => 0,
                'skipped' => $duplicateCsvRows,
            ];

            foreach ($rows as $row) {
                $exists = PaymentMethod::query()
                    ->whereRaw('LOWER(name) = ?', [Str::lower($row['name'])])
                    ->exists();

                if ($exists) {
                    $summary['skipped']++;

                    continue;
                }

                PaymentMethod::create($row);
                $summary['created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['created']} payment method(s) created; {$summary['skipped']} existing or duplicate row(s) skipped.";
    }
}
