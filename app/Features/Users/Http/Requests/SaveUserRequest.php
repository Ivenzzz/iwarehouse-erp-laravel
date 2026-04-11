<?php

namespace App\Features\Users\Http\Requests;

use App\Features\Users\Support\UserManagement;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SaveUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $permission = $this->user() instanceof User && $this->route('user') instanceof User
            ? 'users.update'
            : 'users.create';

        return $this->user()?->can($permission) ?? false;
    }

    public function rules(): array
    {
        $user = $this->targetUser();
        $employeeAccountId = $user?->employeeAccount()->value('id');

        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'username')->ignore($user),
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user),
            ],
            'password' => [
                $user === null ? 'required' : 'nullable',
                'confirmed',
                Password::defaults(),
            ],
            'status' => ['required', Rule::in(UserManagement::statuses())],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'employee_id' => [
                'nullable',
                'integer',
                'exists:employees,id',
                Rule::unique('employee_accounts', 'employee_id')->ignore($employeeAccountId),
            ],
        ];
    }

    public function payload(): array
    {
        $validated = $this->validated();

        return [
            'name' => trim($validated['name']),
            'username' => trim($validated['username']),
            'email' => $this->nullableTrim($validated['email'] ?? null),
            'password' => $this->nullableTrim($validated['password'] ?? null),
            'status' => $validated['status'],
            'roles' => array_values($validated['roles']),
            'employee_id' => $validated['employee_id'] ? (int) $validated['employee_id'] : null,
        ];
    }

    private function targetUser(): ?User
    {
        $user = $this->route('user');

        return $user instanceof User ? $user : null;
    }

    private function nullableTrim(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return trim($value);
    }
}
