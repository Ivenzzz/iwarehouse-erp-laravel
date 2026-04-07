<?php

namespace App\Features\Suppliers\Http\Requests;

use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'legal_business_name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('suppliers', 'legal_business_name')->ignore($this->supplier()?->id),
            ],
            'trade_name' => ['nullable', 'string', 'max:150'],
            'address' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['Active', 'On-Hold', 'Blacklisted', 'Archived'])],
            'email' => ['nullable', 'email', 'max:150'],
            'mobile' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $supplier = $this->supplier();
            $name = Str::lower(trim((string) $this->input('legal_business_name')));

            if ($name === '') {
                return;
            }

            $exists = Supplier::query()
                ->whereRaw('LOWER(legal_business_name) = ?', [$name])
                ->when($supplier !== null, fn ($query) => $query->whereKeyNot($supplier->id))
                ->exists();

            if ($exists) {
                $validator->errors()->add('legal_business_name', 'The legal business name has already been taken.');
            }
        });
    }

    /**
     * @return array{legal_business_name: string, trade_name: string|null, address: string|null, status: string, email: string|null, mobile: string|null}
     */
    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'legal_business_name' => trim($validated['legal_business_name']),
            'trade_name' => isset($validated['trade_name']) && trim((string) $validated['trade_name']) !== ''
                ? trim((string) $validated['trade_name'])
                : null,
            'address' => isset($validated['address']) && trim((string) $validated['address']) !== ''
                ? trim((string) $validated['address'])
                : null,
            'status' => $validated['status'],
            'email' => isset($validated['email']) && trim((string) $validated['email']) !== ''
                ? trim((string) $validated['email'])
                : null,
            'mobile' => isset($validated['mobile']) && trim((string) $validated['mobile']) !== ''
                ? trim((string) $validated['mobile'])
                : null,
        ];
    }

    private function supplier(): ?Supplier
    {
        $supplier = $this->route('supplier');

        return $supplier instanceof Supplier ? $supplier : null;
    }
}
