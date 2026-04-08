<?php

namespace App\Features\PaymentMethods\Http\Requests;

use App\Models\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('payment_methods', 'name')->ignore($this->paymentMethod()?->id),
            ],
            'type' => ['required', 'string', Rule::in(PaymentMethod::TYPES)],
            'logo' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array{name: string, type: string, logo: string|null}
     */
    public function payload(): array
    {
        $validated = $this->validated();
        $logo = trim((string) ($validated['logo'] ?? ''));

        return [
            'name' => trim($validated['name']),
            'type' => $validated['type'],
            'logo' => $logo !== '' ? $logo : null,
        ];
    }

    private function paymentMethod(): ?PaymentMethod
    {
        $paymentMethod = $this->route('paymentMethod');

        return $paymentMethod instanceof PaymentMethod ? $paymentMethod : null;
    }
}
