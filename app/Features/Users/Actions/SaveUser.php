<?php

namespace App\Features\Users\Actions;

use App\Features\Users\Support\UserManagement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SaveUser
{
    public function __construct(private readonly UserManagement $userManagement) {}

    public function handle(array $payload, User $actor, ?User $user = null): User
    {
        return DB::transaction(function () use ($payload, $actor, $user): User {
            $this->userManagement->ensureCanAssignRoles($actor, $payload['roles']);

            if ($user !== null) {
                $this->userManagement->ensureCanManageTarget($actor, $user);
                $this->userManagement->ensureCanRemoveRoles($user, $payload['roles']);
            }

            $userPayload = [
                'name' => $payload['name'],
                'username' => $payload['username'],
                'email' => $payload['email'],
                'status' => $payload['status'],
            ];

            if ($payload['password'] !== null) {
                $userPayload['password'] = $payload['password'];
            }

            if ($user === null) {
                $userPayload['created_by_id'] = $actor->id;
                $user = User::create($userPayload);
            } else {
                $user->update($userPayload);
            }

            $user->syncRoles($payload['roles']);

            if ($payload['employee_id'] === null) {
                $user->employeeAccount()->delete();
            } else {
                $user->employeeAccount()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'employee_id' => $payload['employee_id'],
                        'created_by_id' => $actor->id,
                    ],
                );
            }

            if ($user->status === User::STATUS_INACTIVE) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }

            return $user->fresh(['roles', 'createdBy', 'employeeAccount.employee.jobTitle.department']);
        });
    }
}
