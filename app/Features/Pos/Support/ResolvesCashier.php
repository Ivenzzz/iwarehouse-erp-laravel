<?php

namespace App\Features\Pos\Support;

use App\Models\User;

class ResolvesCashier
{
    public function resolve(User $user): array
    {
        return [
            'user' => $user,
            'error' => null,
        ];
    }
}
