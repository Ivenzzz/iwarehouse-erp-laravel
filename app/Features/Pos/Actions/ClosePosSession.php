<?php

namespace App\Features\Pos\Actions;

use App\Models\PosSession;

class ClosePosSession
{
    public function handle(PosSession $session, float $closingBalance, ?string $cashierRemarks): PosSession
    {
        $session->update([
            'status' => PosSession::STATUS_CLOSED,
            'closing_balance' => $closingBalance,
            'shift_end_time' => now(),
            'cashier_remarks' => $cashierRemarks,
        ]);

        return $session->fresh(['warehouse', 'employee']);
    }
}
