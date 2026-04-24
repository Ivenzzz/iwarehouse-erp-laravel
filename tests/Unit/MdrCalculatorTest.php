<?php

namespace Tests\Unit;

use App\Features\SalesProfitTracker\Support\MdrCalculator;
use PHPUnit\Framework\TestCase;

class MdrCalculatorTest extends TestCase
{
    public function test_rate_for_term_matches_expected_tiers(): void
    {
        $this->assertSame(3.5, MdrCalculator::rateForTerm(0));
        $this->assertSame(6.5, MdrCalculator::rateForTerm(3));
        $this->assertSame(6.5, MdrCalculator::rateForTerm(6));
        $this->assertSame(9.5, MdrCalculator::rateForTerm(9));
        $this->assertSame(12.5, MdrCalculator::rateForTerm(12));
        $this->assertSame(13.5, MdrCalculator::rateForTerm(13));
    }

    public function test_deduction_uses_tier_rate(): void
    {
        $this->assertSame(650.0, MdrCalculator::deduction(10000, 6));
        $this->assertSame(1350.0, MdrCalculator::deduction(10000, 13));
    }
}
