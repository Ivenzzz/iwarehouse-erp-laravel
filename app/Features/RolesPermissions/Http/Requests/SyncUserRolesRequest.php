<?php

namespace App\Features\RolesPermissions\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncUserRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('roles-permissions.assign') ?? false;
    }

    public function rules(): array
    {
        return [
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [
                'required',
                Rule::exists('roles', 'name')->where('guard_name', 'web'),
            ],
        ];
    }
}
