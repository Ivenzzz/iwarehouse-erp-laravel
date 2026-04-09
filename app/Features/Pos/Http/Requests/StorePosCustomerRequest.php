<?php

namespace App\Features\Pos\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePosCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150', 'unique:customer_contacts,email'],
            'address_json' => ['nullable', 'array'],
            'address_json.country' => ['nullable', 'string', 'max:100'],
            'address_json.country_code' => ['nullable', 'string', 'max:10'],
            'address_json.region' => ['nullable', 'string', 'max:100'],
            'address_json.province' => ['nullable', 'string', 'max:100'],
            'address_json.city_municipality' => ['nullable', 'string', 'max:100'],
            'address_json.barangay' => ['nullable', 'string', 'max:100'],
            'address_json.postal_code' => ['nullable', 'string', 'max:20'],
            'address_json.street' => ['nullable', 'string', 'max:200'],
        ];
    }
}
