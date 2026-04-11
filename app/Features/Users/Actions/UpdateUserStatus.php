<?php

namespace App\Features\Users\Actions;

use App\Features\Users\Support\UserManagement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateUserStatus
{
    public function __construct(private readonly UserManagement $userManagement) {}

    public function handle(User $actor, User $target, string $status): void
    {
        $this->userManagement->ensureCanManageTarget($actor, $target);

        if ($status === User::STATUS_INACTIVE) {
            $this->userManagement->ensureNotSelfDestructive($actor, $target, 'deactivate');
            $this->userManagement->ensureNotLastActiveSuperAdmin($target, 'deactivate the last active SuperAdmin');
        }

        $target->update(['status' => $status]);

        if ($status === User::STATUS_INACTIVE) {
            DB::table('sessions')->where('user_id', $target->id)->delete();
        }
    }
}
