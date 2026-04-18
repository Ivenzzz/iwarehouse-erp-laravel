<?php

namespace App\Features\GoodsReceipts\Actions;

use App\Features\ProductMasters\Actions\GenerateProductVariants;
use App\Models\ProductMaster;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;

class MatchOrCreatePurchaseVariant
{
    public function __construct(
        private readonly GenerateProductVariants $generateProductVariants,
    ) {}

    public function handle(array $row, ProductMaster $master): ?ProductVariant
    {
        $csv = $this->csvAttributes($row);
        $variants = ProductVariant::query()
            ->where('product_master_id', $master->id)
            ->get();

        $matched = $this->findBestVariant($variants, $csv);
        if ($matched) {
            return $matched;
        }

        $this->generateProductVariants->handle($master, [
            'conditions' => [$csv['condition']],
            'colors' => [$csv['color_raw']],
            'rams' => [$csv['ram_raw']],
            'roms' => [$csv['rom_raw']],
            'shared_attributes' => array_filter([
                'model_code' => $csv['model_code_raw'],
                'cpu' => $csv['cpu_raw'],
                'gpu' => $csv['gpu_raw'],
                'ram_type' => $csv['ram_type_raw'],
                'rom_type' => $csv['rom_type_raw'],
                'operating_system' => $csv['operating_system_raw'],
                'screen' => $csv['screen_raw'],
            ], fn ($value) => trim((string) $value) !== ''),
        ]);

        $variants = ProductVariant::query()
            ->where('product_master_id', $master->id)
            ->get();

        return $this->findBestVariant($variants, $csv);
    }

    /** @param Collection<int, ProductVariant> $variants */
    private function findBestVariant(Collection $variants, array $csv): ?ProductVariant
    {
        $masterVariants = $variants
            ->filter(fn (ProductVariant $variant) => $this->normalizeCondition((string) $variant->condition) === $csv['condition'])
            ->values();

        if ($masterVariants->isEmpty()) {
            return null;
        }

        $bestVariant = null;
        $bestScore = -1;

        foreach ($masterVariants as $variant) {
            $variantAttrs = $this->variantAttributes($variant);

            if (! $this->isCandidateMatch($csv, $variantAttrs)) {
                continue;
            }

            $score = $this->scoreMatch($csv, $variantAttrs);
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestVariant = $variant;
            }
        }

        return $bestVariant;
    }

    private function isCandidateMatch(array $csv, array $variant): bool
    {
        if ($csv['ram'] !== '' && $variant['ram'] !== '' && $csv['ram'] !== $variant['ram']) {
            return false;
        }

        if ($csv['rom'] !== '' && $variant['rom'] !== '' && $csv['rom'] !== $variant['rom']) {
            return false;
        }

        foreach (['color', 'model_code', 'cpu', 'gpu', 'ram_type', 'rom_type', 'operating_system', 'screen'] as $key) {
            if ($csv[$key] !== '' && $variant[$key] !== '' && $csv[$key] !== $variant[$key]) {
                return false;
            }
        }

        return true;
    }

    private function scoreMatch(array $csv, array $variant): int
    {
        $score = 0;

        if ($csv['model_code'] !== '' && $variant['model_code'] === $csv['model_code']) {
            $score += 200;
        }

        if ($csv['ram'] !== '' && $variant['ram'] === $csv['ram']) {
            $score += 60;
        }
        if ($csv['rom'] !== '' && $variant['rom'] === $csv['rom']) {
            $score += 60;
        }
        if ($csv['color'] !== '' && $variant['color'] === $csv['color']) {
            $score += 30;
        }

        foreach (['cpu', 'gpu', 'ram_type', 'rom_type', 'operating_system', 'screen'] as $key) {
            if ($csv[$key] !== '' && $variant[$key] === $csv[$key]) {
                $score += 40;
            }
        }

        return $score;
    }

    private function csvAttributes(array $row): array
    {
        $ramRaw = (string) ($row['Ram Capacity'] ?? '');
        $romRaw = (string) ($row['Rom Capacity'] ?? '');
        $colorRaw = (string) ($row['Color'] ?? '');
        $modelCodeRaw = (string) ($row['Model Code'] ?? '');
        $cpuRaw = (string) ($row['CPU'] ?? '');
        $gpuRaw = (string) ($row['GPU'] ?? '');
        $ramTypeRaw = (string) ($row['Ram Type'] ?? '');
        $romTypeRaw = (string) ($row['Rom Type'] ?? '');
        $operatingSystemRaw = (string) ($row['OS'] ?? '');
        $screenRaw = (string) ($row['Resolution'] ?? '');

        return [
            'condition' => $this->normalizeCondition((string) ($row['Condition'] ?? '')),
            'ram' => $this->normalizeCapacity($ramRaw),
            'rom' => $this->normalizeCapacity($romRaw),
            'color' => $this->sanitize($colorRaw),
            'model_code' => $this->sanitize($modelCodeRaw),
            'cpu' => $this->sanitize($cpuRaw),
            'gpu' => $this->sanitize($gpuRaw),
            'ram_type' => $this->sanitize($ramTypeRaw),
            'rom_type' => $this->sanitize($romTypeRaw),
            'operating_system' => $this->sanitize($operatingSystemRaw),
            'screen' => $this->sanitize($screenRaw),
            'ram_raw' => trim($this->normalizeCapacity($ramRaw)),
            'rom_raw' => trim($this->normalizeCapacity($romRaw)),
            'color_raw' => trim($colorRaw),
            'model_code_raw' => trim($modelCodeRaw),
            'cpu_raw' => trim($cpuRaw),
            'gpu_raw' => trim($gpuRaw),
            'ram_type_raw' => trim($ramTypeRaw),
            'rom_type_raw' => trim($romTypeRaw),
            'operating_system_raw' => trim($operatingSystemRaw),
            'screen_raw' => trim($screenRaw),
        ];
    }

    private function variantAttributes(ProductVariant $variant): array
    {
        return [
            'ram' => $this->normalizeCapacity((string) $variant->ram),
            'rom' => $this->normalizeCapacity((string) $variant->rom),
            'color' => $this->sanitize((string) $variant->color),
            'model_code' => $this->sanitize((string) $variant->model_code),
            'cpu' => $this->sanitize((string) $variant->cpu),
            'gpu' => $this->sanitize((string) $variant->gpu),
            'ram_type' => $this->sanitize((string) $variant->ram_type),
            'rom_type' => $this->sanitize((string) $variant->rom_type),
            'operating_system' => $this->sanitize((string) $variant->operating_system),
            'screen' => $this->sanitize((string) $variant->screen),
        ];
    }

    private function sanitize(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower(trim($value))) ?: '';
    }

    private function normalizeCapacity(string $raw): string
    {
        $cleaned = $this->sanitize($raw);
        if ($cleaned === '') {
            return '';
        }

        if (preg_match('/^\d+$/', $cleaned) === 1) {
            $n = (int) $cleaned;

            return $n === 1024 ? '1TB' : "{$n}GB";
        }

        if (preg_match('/^(\d+)(tb|gb)$/', $cleaned, $matches) === 1) {
            $n = (int) $matches[1];
            $unit = strtoupper($matches[2]);
            if ($unit === 'GB' && $n === 1024) {
                return '1TB';
            }

            return "{$n}{$unit}";
        }

        return strtoupper(trim($raw));
    }

    private function normalizeCondition(string $value): string
    {
        $normalized = $this->sanitize($value);
        if (in_array($normalized, ['certifiedpreowned', 'preowned', 'cpo'], true)) {
            return 'Certified Pre-Owned';
        }
        if ($normalized === 'refurbished') {
            return 'Refurbished';
        }

        return 'Brand New';
    }
}
