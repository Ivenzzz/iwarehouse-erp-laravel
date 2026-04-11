<?php

namespace App\Features\Customers\Actions;

use App\Models\Customer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportCustomersCsv
{
    public const HEADERS = [
        'customer_kind',
        'firstname',
        'lastname',
        'organization_name',
        'legal_name',
        'tax_id',
        'date_of_birth',
        'customer_group',
        'customer_type',
        'status',
        'contact_firstname',
        'contact_lastname',
        'email',
        'phone',
        'street',
        'region',
        'province',
        'city_municipality',
        'barangay',
        'postal_code',
    ];

    public function handle(): StreamedResponse
    {
        $customers = Customer::query()
            ->with([
                'group',
                'type',
                'contacts' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
                'addresses' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
            ])
            ->orderBy('customer_code')
            ->get();

        $callback = function () use ($customers): void {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, self::HEADERS);

            foreach ($customers as $customer) {
                $contact = $customer->contacts->first();
                $address = $customer->addresses->first();

                fputcsv($stream, [
                    $customer->customer_kind,
                    $customer->firstname,
                    $customer->lastname,
                    $customer->organization_name,
                    $customer->legal_name,
                    $customer->tax_id,
                    optional($customer->date_of_birth)?->toDateString(),
                    $customer->group?->name,
                    $customer->type?->name,
                    $customer->status,
                    $contact?->firstname,
                    $contact?->lastname,
                    $contact?->email,
                    $contact?->phone,
                    $address?->street,
                    $address?->region,
                    $address?->province,
                    $address?->city_municipality,
                    $address?->barangay,
                    $address?->postal_code,
                ]);
            }

            fclose($stream);
        };

        return response()->streamDownload($callback, 'customers.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
