<?php

namespace App\Features\Pos\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePosSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'opening_balance' => ['required', 'numeric', 'min:0'],
        ];
    }
}
