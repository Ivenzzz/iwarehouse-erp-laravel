<?php

namespace Tests\Unit\ProductMasters;

use App\Features\ProductMasters\Support\NormalizesModelNameByCode;
use PHPUnit\Framework\TestCase;

class NormalizesModelNameByCodeTest extends TestCase
{
    public function test_it_removes_trailing_model_code_case_insensitively(): void
    {
        $normalizer = new NormalizesModelNameByCode();

        $this->assertSame(
            'ASPIRE LITE',
            $normalizer->handle('ASPIRE LITE AL15-33P-338H', 'AL15-33P-338H'),
        );
        $this->assertSame(
            'ASPIRE LITE',
            $normalizer->handle('ASPIRE LITE al15-33p-338h', 'AL15-33P-338H'),
        );
    }

    public function test_it_removes_all_trailing_repeats_of_model_code(): void
    {
        $normalizer = new NormalizesModelNameByCode();

        $this->assertSame(
            'ASPIRE LITE',
            $normalizer->handle('ASPIRE LITE AL15-33P-338H AL15-33P-338H', 'AL15-33P-338H'),
        );
    }

    public function test_it_keeps_original_when_removal_would_empty_model_name(): void
    {
        $normalizer = new NormalizesModelNameByCode();

        $this->assertSame(
            'AL15-33P-338H',
            $normalizer->handle('AL15-33P-338H', 'AL15-33P-338H'),
        );
    }

    public function test_it_leaves_name_unchanged_when_model_code_not_trailing_suffix(): void
    {
        $normalizer = new NormalizesModelNameByCode();

        $this->assertSame(
            'ASPIRE LITE',
            $normalizer->handle('ASPIRE LITE', 'AL15-33P-338H'),
        );
        $this->assertSame(
            'AL15-33P-338H ASPIRE',
            $normalizer->handle('AL15-33P-338H ASPIRE', 'AL15-33P-338H'),
        );
    }
}
