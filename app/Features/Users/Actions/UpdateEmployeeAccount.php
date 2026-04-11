<?php

namespace App\Features\Users\Actions;

use App\Features\Users\Support\UserManagement;
use App\Models\User;

class UpdateEmployeeAccount
{
    public function __construct(private readonly UserManagement $userManagement) {}

    public function handle(User $actor, User $target, ?int $employeeId): void
    {
        $this->userManagement->ensureCanManageTarget($actor, $target);

        if ($employeeId === null) {
            $target->employeeAccount()->delete();

            return;
        }

        $target->employeeAccount()->updateOrCreate(
            ['user_id' => $target->id],
            [
                'employee_id' => $employeeId,
                'created_by_id' => $actor->id,
            ],
        );
    }
}
