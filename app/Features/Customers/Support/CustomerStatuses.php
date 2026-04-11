<?php

namespace App\Features\Customers\Support;

class CustomerStatuses
{
    public const ACTIVE = 'active';
    public const INACTIVE = 'inactive';
    public const BLACKLISTED = 'blacklisted';

    public static function values(): array
    {
        return [
            self::ACTIVE,
            self::INACTIVE,
            self::BLACKLISTED,
        ];
    }
}
