<?php

namespace App\Support;

use App\Models\ProductCategory;

class ProductVariantDefinitions
{
    public const CONDITION_BRAND_NEW = 'Brand New';

    public const CONDITION_CERTIFIED_PRE_OWNED = 'Certified Pre-Owned';

    /**
     * @return array<int, array{
     *     key: string,
     *     label: string,
     *     group: string,
     *     data_type: string,
     *     sort_order: int,
     *     is_computer_only: bool,
     *     is_dimension: bool
     * }>
     */
    public static function all(): array
    {
        return [
            ['key' => 'condition', 'label' => 'Condition', 'group' => 'Core', 'data_type' => 'text', 'sort_order' => 10, 'is_computer_only' => false, 'is_dimension' => true],
            ['key' => 'color', 'label' => 'Color', 'group' => 'Core', 'data_type' => 'text', 'sort_order' => 20, 'is_computer_only' => false, 'is_dimension' => true],
            ['key' => 'ram', 'label' => 'RAM', 'group' => 'Core', 'data_type' => 'text', 'sort_order' => 30, 'is_computer_only' => false, 'is_dimension' => true],
            ['key' => 'storage', 'label' => 'Storage', 'group' => 'Core', 'data_type' => 'text', 'sort_order' => 40, 'is_computer_only' => false, 'is_dimension' => true],
            ['key' => 'cpu', 'label' => 'CPU', 'group' => 'Computer Specs', 'data_type' => 'text', 'sort_order' => 100, 'is_computer_only' => true, 'is_dimension' => false],
            ['key' => 'gpu', 'label' => 'GPU', 'group' => 'Computer Specs', 'data_type' => 'text', 'sort_order' => 110, 'is_computer_only' => true, 'is_dimension' => false],
            ['key' => 'ram_type', 'label' => 'RAM Type', 'group' => 'Computer Specs', 'data_type' => 'text', 'sort_order' => 120, 'is_computer_only' => true, 'is_dimension' => false],
            ['key' => 'rom_type', 'label' => 'ROM Type', 'group' => 'Computer Specs', 'data_type' => 'text', 'sort_order' => 130, 'is_computer_only' => true, 'is_dimension' => false],
            ['key' => 'operating_system', 'label' => 'Operating System', 'group' => 'Computer Specs', 'data_type' => 'text', 'sort_order' => 140, 'is_computer_only' => true, 'is_dimension' => false],
            ['key' => 'screen', 'label' => 'Screen', 'group' => 'Computer Specs', 'data_type' => 'text', 'sort_order' => 150, 'is_computer_only' => true, 'is_dimension' => false],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }

    /**
     * @return array<int, string>
     */
    public static function dimensionKeys(): array
    {
        return collect(self::all())
            ->filter(fn (array $definition) => $definition['is_dimension'])
            ->pluck('key')
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    public static function commonKeys(): array
    {
        return collect(self::all())
            ->filter(fn (array $definition) => ! $definition['is_computer_only'])
            ->pluck('key')
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    public static function computerOnlyKeys(): array
    {
        return collect(self::all())
            ->filter(fn (array $definition) => $definition['is_computer_only'])
            ->pluck('key')
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    public static function sharedComputerKeys(): array
    {
        return [
            'cpu',
            'gpu',
            'ram_type',
            'rom_type',
            'operating_system',
            'screen',
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function generationKeys(): array
    {
        return [
            'condition',
            'color',
            'ram',
            'storage',
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function conditions(): array
    {
        return [
            self::CONDITION_BRAND_NEW,
            self::CONDITION_CERTIFIED_PRE_OWNED,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function computerKeywords(): array
    {
        return [
            'laptop',
            'desktop',
            'computer',
            'notebook',
            'workstation',
            'pc',
        ];
    }

    public static function supportsComputerVariants(ProductCategory $subcategory): bool
    {
        $subcategory->loadMissing('parent');

        $names = array_filter([
            $subcategory->name,
            $subcategory->parent?->name,
        ]);

        foreach ($names as $name) {
            if (self::nameMatchesComputerKeywords($name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<int, string>
     */
    public static function allowedKeysForCategory(ProductCategory $subcategory): array
    {
        return self::supportsComputerVariants($subcategory)
            ? array_values(array_unique([...self::commonKeys(), ...self::computerOnlyKeys()]))
            : self::commonKeys();
    }

    private static function nameMatchesComputerKeywords(string $value): bool
    {
        $needle = mb_strtolower($value);

        foreach (self::computerKeywords() as $keyword) {
            if (str_contains($needle, $keyword)) {
                return true;
            }
        }

        return false;
    }
}
