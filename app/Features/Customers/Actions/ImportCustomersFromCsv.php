<?php

namespace App\Features\Customers\Actions;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportCustomersFromCsv
{
    private const REQUIRED_FIELDS = ['customer_code', 'firstname', 'lastname'];
    private const OPTIONAL_FIELDS = [
        'date_of_birth',
        'email',
        'phone',
        'country',
        'region',
        'province',
        'city_municipality',
        'barangay',
        'postal_code',
        'street',
        'customer_group',
        'customer_type',
    ];
    private const FIELD_ALIASES = [
        'city' => 'city_municipality',
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

        $headerMap = $this->buildHeaderMap($normalizedHeaders->all());

        foreach (self::REQUIRED_FIELDS as $requiredField) {
            if (! array_key_exists($requiredField, $headerMap)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => 'The CSV must include Customer Code, Firstname, and Lastname headers.',
                ]);
            }
        }

        $rowNumber = 1;
        $rows = [];
        $seenCustomerCodes = [];
        $seenEmails = [];
        $duplicateCsvRows = 0;
        $invalidCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            $data = [];

            foreach ([...self::REQUIRED_FIELDS, ...self::OPTIONAL_FIELDS] as $field) {
                if (! array_key_exists($field, $headerMap)) {
                    $data[$field] = null;
                    continue;
                }

                $value = trim((string) ($row[$headerMap[$field]] ?? ''));
                $data[$field] = $value === '' ? null : $value;
            }

            if (collect($data)->every(fn ($value) => $value === null)) {
                continue;
            }

            if (
                blank($data['customer_code'])
                || blank($data['firstname'])
                || blank($data['lastname'])
            ) {
                $invalidCsvRows++;
                continue;
            }

            if (Str::length($data['customer_code']) > 20) {
                $invalidCsvRows++;
                continue;
            }

            foreach (['firstname', 'lastname', 'email', 'phone', 'country', 'region', 'province', 'city_municipality', 'barangay', 'postal_code', 'street'] as $field) {
                if ($data[$field] === null) {
                    continue;
                }

                $maxLength = match ($field) {
                    'email' => 150,
                    'phone' => 30,
                    'country' => 100,
                    'postal_code' => 20,
                    'street' => 200,
                    default => 100,
                };

                if (Str::length($data[$field]) > $maxLength) {
                    $invalidCsvRows++;
                    continue 2;
                }
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

            if ($data['email'] !== null) {
                $normalizedEmail = Str::lower($data['email']);
                if (! filter_var($data['email'], FILTER_VALIDATE_EMAIL) || isset($seenEmails[$normalizedEmail])) {
                    $invalidCsvRows++;
                    continue;
                }

                $seenEmails[$normalizedEmail] = true;
                $data['email'] = $normalizedEmail;
            }

            $rows[] = $data;
        }

        fclose($handle);

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows, $invalidCsvRows) {
            $groupMap = CustomerGroup::query()
                ->select('id', 'name')
                ->get()
                ->keyBy(fn (CustomerGroup $group) => Str::lower($group->name));
            $typeMap = CustomerType::query()
                ->select('id', 'name')
                ->get()
                ->keyBy(fn (CustomerType $type) => Str::lower($type->name));
            $existingEmails = Customer::query()
                ->join('customer_contacts', 'customer_contacts.customer_id', '=', 'customers.id')
                ->whereNotNull('customer_contacts.email')
                ->pluck('customer_contacts.email')
                ->map(fn (string $email) => Str::lower($email))
                ->flip();

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

                if ($row['email'] !== null && $existingEmails->has($row['email'])) {
                    $summary['customers_skipped']++;
                    continue;
                }

                $customer = Customer::create([
                    'customer_code' => $row['customer_code'],
                    'customer_kind' => Customer::KIND_PERSON,
                    'firstname' => $row['firstname'],
                    'lastname' => $row['lastname'],
                    'date_of_birth' => $this->normalizeDate($row['date_of_birth']),
                    'customer_group_id' => $this->resolveLookupId($groupMap, $row['customer_group']),
                    'customer_type_id' => $this->resolveLookupId($typeMap, $row['customer_type']),
                ]);

                if ($row['email'] !== null) {
                    $existingEmails[$row['email']] = true;
                }

                $customer->contacts()->create([
                    'contact_type' => 'primary',
                    'firstname' => $row['firstname'],
                    'lastname' => $row['lastname'],
                    'email' => $row['email'],
                    'phone' => $row['phone'],
                    'is_primary' => true,
                ]);

                $customer->addresses()->create([
                    'address_type' => 'primary',
                    'is_primary' => true,
                    'country' => $this->normalizeCountry($row['country']),
                    'region' => $row['region'],
                    'province' => $row['province'],
                    'city_municipality' => $row['city_municipality'],
                    'barangay' => $row['barangay'],
                    'postal_code' => $row['postal_code'],
                    'street' => $row['street'],
                ]);

                $summary['customers_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['customers_created']} customer(s) created; {$summary['customers_skipped']} existing, duplicate, or invalid customer row(s) skipped.";
    }

    private function normalizeHeader(string $header): string
    {
        $normalized = (string) Str::of($header)
            ->replace("\u{FEFF}", '')
            ->trim()
            ->lower()
            ->replaceMatches('/[\s_]+/', '_');

        return self::FIELD_ALIASES[$normalized] ?? $normalized;
    }

    private function buildHeaderMap(array $normalizedHeaders): array
    {
        $map = [];

        foreach ($normalizedHeaders as $index => $header) {
            if (! is_string($header) || $header === '' || array_key_exists($header, $map)) {
                continue;
            }

            $map[$header] = $index;
        }

        return $map;
    }

    private function resolveLookupId(Collection $lookup, ?string $name): ?int
    {
        if ($name === null) {
            return null;
        }

        $record = $lookup->get(Str::lower($name));

        return $record?->id;
    }

    private function normalizeDate(?string $date): ?string
    {
        if ($date === null) {
            return null;
        }

        try {
            return Carbon::parse($date)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeCountry(?string $country): string
    {
        if ($country === null) {
            return 'PH';
        }

        $normalized = Str::upper(trim($country));

        if (in_array($normalized, ['PH', 'PHILIPPINES'], true)) {
            return 'PH';
        }

        return Str::limit($normalized, 10, '');
    }
}
