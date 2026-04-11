<?php

namespace App\Features\Customers\Actions;

use App\Features\Customers\Support\CustomerStatuses;
use App\Models\Customer;
use App\Models\CustomerContact;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImportCustomersFromCsv
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
        $requiredHeaders = ExportCustomersCsv::HEADERS;

        foreach ($requiredHeaders as $requiredHeader) {
            if (! $normalizedHeaders->contains($requiredHeader)) {
                fclose($handle);
                throw ValidationException::withMessages([
                    'file' => 'The CSV must include all customer headers exported by the Customers page.',
                ]);
            }
        }

        $groups = CustomerGroup::query()->get()->keyBy(fn (CustomerGroup $group) => Str::lower($group->name));
        $types = CustomerType::query()->get()->keyBy(fn (CustomerType $type) => Str::lower($type->name));
        $headerMap = $normalizedHeaders->flip();
        $rowNumber = 1;
        $errors = [];
        $rows = [];
        $seenContactKeys = [];
        $duplicateCsvRows = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            $data = [];

            foreach ($requiredHeaders as $header) {
                $data[$header] = trim((string) ($row[$headerMap[$header]] ?? ''));
            }

            if (collect($data)->every(fn (string $value) => $value === '')) {
                continue;
            }

            $kind = Str::lower($data['customer_kind']);
            $status = Str::lower($data['status'] ?: CustomerStatuses::ACTIVE);
            $group = $groups[Str::lower($data['customer_group'])] ?? null;
            $type = $types[Str::lower($data['customer_type'])] ?? null;

            if (! in_array($kind, [Customer::KIND_PERSON, Customer::KIND_ORGANIZATION], true)) {
                $errors['file'][] = "Row {$rowNumber}: customer_kind must be person or organization.";
                continue;
            }

            if ($kind === Customer::KIND_PERSON && ($data['firstname'] === '' || $data['lastname'] === '')) {
                $errors['file'][] = "Row {$rowNumber}: firstname and lastname are required for person customers.";
                continue;
            }

            if ($kind === Customer::KIND_ORGANIZATION && $data['organization_name'] === '') {
                $errors['file'][] = "Row {$rowNumber}: organization_name is required for organization customers.";
                continue;
            }

            if (! in_array($status, CustomerStatuses::values(), true)) {
                $errors['file'][] = "Row {$rowNumber}: status must be active, inactive, or blacklisted.";
                continue;
            }

            if ($group === null) {
                $errors['file'][] = "Row {$rowNumber}: customer_group must match an existing customer group.";
                continue;
            }

            if ($type === null) {
                $errors['file'][] = "Row {$rowNumber}: customer_type must match an existing customer type.";
                continue;
            }

            if ($data['phone'] === '') {
                $errors['file'][] = "Row {$rowNumber}: phone is required.";
                continue;
            }

            if ($data['email'] !== '' && ! filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['file'][] = "Row {$rowNumber}: email must be a valid email address.";
                continue;
            }

            foreach (['firstname', 'lastname', 'contact_firstname', 'contact_lastname', 'region', 'province', 'city_municipality', 'barangay'] as $field) {
                if (Str::length($data[$field]) > 100) {
                    $errors['file'][] = "Row {$rowNumber}: {$field} may not be greater than 100 characters.";
                    continue 2;
                }
            }

            foreach (['organization_name', 'legal_name', 'email'] as $field) {
                if (Str::length($data[$field]) > 150) {
                    $errors['file'][] = "Row {$rowNumber}: {$field} may not be greater than 150 characters.";
                    continue 2;
                }
            }

            if (Str::length($data['phone']) > 30 || Str::length($data['postal_code']) > 20 || Str::length($data['street']) > 200 || Str::length($data['tax_id']) > 100) {
                $errors['file'][] = "Row {$rowNumber}: one or more fields exceed the allowed length.";
                continue;
            }

            if ($data['region'] === '' || $data['city_municipality'] === '' || $data['barangay'] === '') {
                $errors['file'][] = "Row {$rowNumber}: region, city_municipality, and barangay are required.";
                continue;
            }

            $dedupeKeys = ['phone:'.Str::lower($data['phone'])];

            if ($data['email'] !== '') {
                $dedupeKeys[] = 'email:'.Str::lower($data['email']);
            }

            foreach ($dedupeKeys as $dedupeKey) {
                if (isset($seenContactKeys[$dedupeKey])) {
                    $duplicateCsvRows++;
                    continue 2;
                }
            }

            foreach ($dedupeKeys as $dedupeKey) {
                $seenContactKeys[$dedupeKey] = true;
            }

            $rows[] = [
                ...$data,
                'customer_kind' => $kind,
                'status' => $status,
                'customer_group_id' => $group->id,
                'customer_type_id' => $type->id,
            ];
        }

        fclose($handle);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $summary = DB::transaction(function () use ($rows, $duplicateCsvRows) {
            $summary = [
                'customers_created' => 0,
                'customers_skipped' => $duplicateCsvRows,
            ];

            foreach ($rows as $row) {
                $exists = CustomerContact::query()
                    ->where('phone', $row['phone'])
                    ->when($row['email'] !== '', fn ($query) => $query->orWhere('email', $row['email']))
                    ->exists();

                if ($exists) {
                    $summary['customers_skipped']++;
                    continue;
                }

                $customer = Customer::create([
                    'customer_kind' => $row['customer_kind'],
                    'firstname' => $row['customer_kind'] === Customer::KIND_PERSON ? $this->nullable($row['firstname']) : null,
                    'lastname' => $row['customer_kind'] === Customer::KIND_PERSON ? $this->nullable($row['lastname']) : null,
                    'organization_name' => $row['customer_kind'] === Customer::KIND_ORGANIZATION ? $this->nullable($row['organization_name']) : null,
                    'legal_name' => $this->nullable($row['legal_name']),
                    'tax_id' => $this->nullable($row['tax_id']),
                    'date_of_birth' => $this->nullable($row['date_of_birth']),
                    'customer_group_id' => $row['customer_group_id'],
                    'customer_type_id' => $row['customer_type_id'],
                    'status' => $row['status'],
                ]);

                $customer->contacts()->create([
                    'contact_type' => 'primary',
                    'firstname' => $this->nullable($row['contact_firstname']),
                    'lastname' => $this->nullable($row['contact_lastname']),
                    'email' => $this->nullable($row['email']),
                    'phone' => $row['phone'],
                    'is_primary' => true,
                ]);

                $customer->addresses()->create([
                    'address_type' => 'primary',
                    'is_primary' => true,
                    'country' => 'PH',
                    'region' => $row['region'],
                    'province' => $this->nullable($row['province']),
                    'city_municipality' => $row['city_municipality'],
                    'barangay' => $row['barangay'],
                    'postal_code' => $this->nullable($row['postal_code']),
                    'street' => $this->nullable($row['street']),
                ]);

                $summary['customers_created']++;
            }

            return $summary;
        });

        return "Import complete: {$summary['customers_created']} customer(s) created; {$summary['customers_skipped']} existing or duplicate customer row(s) skipped.";
    }

    private function nullable(string $value): ?string
    {
        return $value === '' ? null : $value;
    }
}
