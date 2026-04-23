<?php

namespace App\Features\CompanyInfo\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyInfoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'website' => ['nullable', 'url', 'max:150'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'remove_logo' => ['nullable', 'boolean'],
        ];
    }

    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'company_name' => trim($validated['company_name']),
            'legal_name' => $this->nullableTrimmed($validated['legal_name'] ?? null),
            'tax_id' => $this->nullableTrimmed($validated['tax_id'] ?? null),
            'address' => $this->nullableTrimmed($validated['address'] ?? null),
            'phone' => $this->nullableTrimmed($validated['phone'] ?? null),
            'email' => $this->nullableTrimmed($validated['email'] ?? null),
            'website' => $this->nullableTrimmed($validated['website'] ?? null),
            'remove_logo' => (bool) ($validated['remove_logo'] ?? false),
        ];
    }

    private function nullableTrimmed(mixed $value): ?string
    {
        $trimmed = trim((string) ($value ?? ''));

        return $trimmed === '' ? null : $trimmed;
    }
}

