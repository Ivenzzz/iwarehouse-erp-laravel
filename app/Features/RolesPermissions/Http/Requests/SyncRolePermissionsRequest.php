<?php

namespace App\Features\RolesPermissions\Http\Requests;

use App\Features\RolesPermissions\Support\RolesPermissionsCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('roles-permissions.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'permissions' => ['required', 'array'],
            'permissions.*' => [
                'required',
                'string',
                Rule::in(RolesPermissionsCatalog::allPermissions()),
            ],
        ];
    }
}
