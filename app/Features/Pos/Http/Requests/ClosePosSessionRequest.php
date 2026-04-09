<?php

namespace App\Features\Pos\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClosePosSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'closing_balance' => ['required', 'numeric', 'min:0'],
            'cashier_remarks' => ['nullable', 'string'],
        ];
    }
}
