<?php

namespace App\Features\SalesProfitTracker\Support;

class MdrCalculator
{
    public static function rateForTerm(?int $loanTermMonths): float
    {
        $term = max(0, (int) ($loanTermMonths ?? 0));

        if ($term > 12) {
            return 12.5 + ($term - 12);
        }

        if ($term >= 12) {
            return 12.5;
        }

        if ($term >= 9) {
            return 9.5;
        }

        if ($term >= 3) {
            return 6.5;
        }

        return 3.5;
    }

    public static function deduction(float $amount, ?int $loanTermMonths): float
    {
        return round($amount * (self::rateForTerm($loanTermMonths) / 100), 2);
    }

    public static function sqlRateExpression(string $loanTermColumn): string
    {
        return "CASE\n"
            . "    WHEN COALESCE({$loanTermColumn}, 0) > 12 THEN 12.5 + (COALESCE({$loanTermColumn}, 0) - 12)\n"
            . "    WHEN COALESCE({$loanTermColumn}, 0) >= 12 THEN 12.5\n"
            . "    WHEN COALESCE({$loanTermColumn}, 0) >= 9 THEN 9.5\n"
            . "    WHEN COALESCE({$loanTermColumn}, 0) >= 3 THEN 6.5\n"
            . "    ELSE 3.5\n"
            . 'END';
    }
}
