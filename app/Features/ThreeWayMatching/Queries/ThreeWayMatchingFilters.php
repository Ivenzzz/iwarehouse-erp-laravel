<?php

namespace App\Features\ThreeWayMatching\Queries;

use Illuminate\Http\Request;

class ThreeWayMatchingFilters
{
    public const STATUS_UNPAID = 'unpaid';

    public const STATUS_PAID = 'paid';

    public const ALLOWED_STATUSES = [
        self::STATUS_UNPAID,
        self::STATUS_PAID,
    ];

    public function fromRequest(Request $request): array
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:unpaid,paid'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'selected_match_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return [
            'status' => $validated['status'] ?? self::STATUS_UNPAID,
            'page' => (int) ($validated['page'] ?? 1),
            'per_page' => (int) ($validated['per_page'] ?? 20),
            'selected_match_id' => isset($validated['selected_match_id']) ? (int) $validated['selected_match_id'] : null,
        ];
    }
}
