<?php

namespace App\Features\Customers\Http\Requests;

use App\Features\Customers\Support\CustomerStatuses;
use App\Models\Customer;
use App\Models\CustomerContact;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customer = $this->customer();

        return [
            'customer_kind' => ['required', Rule::in([Customer::KIND_PERSON, Customer::KIND_ORGANIZATION])],
            'firstname' => ['required_if:customer_kind,person', 'nullable', 'string', 'max:100'],
            'lastname' => ['required_if:customer_kind,person', 'nullable', 'string', 'max:100'],
            'organization_name' => ['required_if:customer_kind,organization', 'nullable', 'string', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:150'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date'],
            'customer_group_id' => ['required', 'integer', 'exists:customer_groups,id'],
            'customer_type_id' => ['required', 'integer', 'exists:customer_types,id'],
            'status' => ['required', Rule::in(CustomerStatuses::values())],
            'contact_firstname' => ['nullable', 'string', 'max:100'],
            'contact_lastname' => ['nullable', 'string', 'max:100'],
            'email' => [
                'nullable',
                'email',
                'max:150',
                Rule::unique('customer_contacts', 'email')->ignore($this->primaryContactId($customer)),
            ],
            'phone' => ['required', 'string', 'max:30'],
            'region' => ['required', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'city_municipality' => ['required', 'string', 'max:100'],
            'barangay' => ['required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'street' => ['nullable', 'string', 'max:200'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $phone = trim((string) $this->input('phone'));

            if ($phone === '') {
                return;
            }

            $customer = $this->customer();
            $exists = CustomerContact::query()
                ->where('phone', $phone)
                ->when($customer !== null, fn ($query) => $query->where('customer_id', '!=', $customer->id))
                ->exists();

            if ($exists) {
                $validator->errors()->add('phone', 'The phone has already been taken.');
            }
        });
    }

    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'customer_kind' => $validated['customer_kind'],
            'firstname' => $this->nullableTrim($validated['firstname'] ?? null),
            'lastname' => $this->nullableTrim($validated['lastname'] ?? null),
            'organization_name' => $this->nullableTrim($validated['organization_name'] ?? null),
            'legal_name' => $this->nullableTrim($validated['legal_name'] ?? null),
            'tax_id' => $this->nullableTrim($validated['tax_id'] ?? null),
            'date_of_birth' => $this->nullableTrim($validated['date_of_birth'] ?? null),
            'customer_group_id' => (int) $validated['customer_group_id'],
            'customer_type_id' => (int) $validated['customer_type_id'],
            'status' => $validated['status'],
            'contact_firstname' => $this->nullableTrim($validated['contact_firstname'] ?? null),
            'contact_lastname' => $this->nullableTrim($validated['contact_lastname'] ?? null),
            'email' => $this->nullableTrim($validated['email'] ?? null),
            'phone' => trim($validated['phone']),
            'region' => trim($validated['region']),
            'province' => $this->nullableTrim($validated['province'] ?? null),
            'city_municipality' => trim($validated['city_municipality']),
            'barangay' => trim($validated['barangay']),
            'postal_code' => $this->nullableTrim($validated['postal_code'] ?? null),
            'street' => $this->nullableTrim($validated['street'] ?? null),
        ];
    }

    private function nullableTrim(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return trim($value);
    }

    private function customer(): ?Customer
    {
        $customer = $this->route('customer');

        return $customer instanceof Customer ? $customer : null;
    }

    private function primaryContactId(?Customer $customer): ?int
    {
        if ($customer === null) {
            return null;
        }

        return $customer->contacts()->where('is_primary', true)->value('id');
    }
}
