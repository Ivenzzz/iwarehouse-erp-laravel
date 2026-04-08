<?php

namespace App\Features\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportInventoryBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'importToken' => ['required', 'string'],
        ];
    }

    public function importToken(): string
    {
        return (string) $this->string('importToken');
    }
}
