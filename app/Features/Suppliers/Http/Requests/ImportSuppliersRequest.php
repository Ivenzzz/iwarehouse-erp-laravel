<?php

namespace App\Features\Suppliers\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class ImportSuppliersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ];
    }

    public function csvFile(): UploadedFile
    {
        return $this->file('file');
    }
}
