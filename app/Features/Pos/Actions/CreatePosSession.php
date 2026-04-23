<?php

namespace App\Features\Pos\Actions;

use App\Models\PosSession;
use App\Models\User;

class CreatePosSession
{
    public function handle(User $user, int $warehouseId, float $openingBalance): PosSession
    {
        return PosSession::create([
            'user_id' => $user->id,
            'warehouse_id' => $warehouseId,
            'opening_balance' => $openingBalance,
            'shift_start_time' => now(),
            'status' => PosSession::STATUS_OPENED,
        ]);
    }
}
