<?php

namespace App\Support;

class ProductMasterSpecDefinitions
{
    /**
     * @return array<int, array{key: string, label: string, group: string, sort_order: int}>
     */
    public static function all(): array
    {
        return [
            ['key' => 'release_date', 'label' => 'Release Date', 'group' => 'General', 'sort_order' => 10],
            ['key' => 'dimensions', 'label' => 'Dimensions', 'group' => 'General', 'sort_order' => 20],
            ['key' => 'weight', 'label' => 'Weight', 'group' => 'General', 'sort_order' => 30],
            ['key' => 'materials', 'label' => 'Materials', 'group' => 'General', 'sort_order' => 40],
            ['key' => 'display_size', 'label' => 'Display Size', 'group' => 'Display', 'sort_order' => 100],
            ['key' => 'display_type', 'label' => 'Display Type', 'group' => 'Display', 'sort_order' => 110],
            ['key' => 'display_resolution', 'label' => 'Display Resolution', 'group' => 'Display', 'sort_order' => 120],
            ['key' => 'display_refresh_rate', 'label' => 'Display Refresh Rate', 'group' => 'Display', 'sort_order' => 130],
            ['key' => 'display_brightness', 'label' => 'Display Brightness', 'group' => 'Display', 'sort_order' => 140],
            ['key' => 'display_protection', 'label' => 'Display Protection', 'group' => 'Display', 'sort_order' => 150],
            ['key' => 'platform_os', 'label' => 'Operating System', 'group' => 'Platform', 'sort_order' => 200],
            ['key' => 'platform_chipset', 'label' => 'Chipset', 'group' => 'Platform', 'sort_order' => 210],
            ['key' => 'platform_cpu', 'label' => 'CPU', 'group' => 'Platform', 'sort_order' => 220],
            ['key' => 'platform_gpu', 'label' => 'GPU', 'group' => 'Platform', 'sort_order' => 230],
            ['key' => 'rear_camera_specs', 'label' => 'Rear Camera Specs', 'group' => 'Camera', 'sort_order' => 300],
            ['key' => 'rear_camera_features', 'label' => 'Rear Camera Features', 'group' => 'Camera', 'sort_order' => 310],
            ['key' => 'rear_camera_video', 'label' => 'Rear Camera Video', 'group' => 'Camera', 'sort_order' => 320],
            ['key' => 'front_camera_specs', 'label' => 'Front Camera Specs', 'group' => 'Camera', 'sort_order' => 330],
            ['key' => 'front_camera_video', 'label' => 'Front Camera Video', 'group' => 'Camera', 'sort_order' => 340],
            ['key' => 'wlan', 'label' => 'WLAN', 'group' => 'Connectivity', 'sort_order' => 400],
            ['key' => 'bluetooth', 'label' => 'Bluetooth', 'group' => 'Connectivity', 'sort_order' => 410],
            ['key' => 'network', 'label' => 'Network', 'group' => 'Connectivity', 'sort_order' => 420],
            ['key' => 'battery_capacity', 'label' => 'Battery Capacity', 'group' => 'Battery', 'sort_order' => 500],
            ['key' => 'battery_charging_speed', 'label' => 'Battery Charging Speed', 'group' => 'Battery', 'sort_order' => 510],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }
}
