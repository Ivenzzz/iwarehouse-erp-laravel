<?php

namespace App\Features\RolesPermissions\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $permission = $this->route('role') === null
            ? 'roles-permissions.create'
            : 'roles-permissions.update';

        return $this->user()?->can($permission) ?? false;
    }

    public function rules(): array
    {
        $roleId = $this->route('role')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')
                    ->where('guard_name', 'web')
                    ->ignore($roleId),
            ],
        ];
    }
}
