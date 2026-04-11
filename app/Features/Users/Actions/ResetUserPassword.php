<?php

namespace App\Features\Users\Actions;

use App\Features\Users\Support\UserManagement;
use App\Models\User;

class ResetUserPassword
{
    public function __construct(private readonly UserManagement $userManagement) {}

    public function handle(User $actor, User $target, string $password): void
    {
        $this->userManagement->ensureCanManageTarget($actor, $target);

        $target->update(['password' => $password]);
    }
}
