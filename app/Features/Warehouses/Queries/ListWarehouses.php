<?php

namespace App\Features\Warehouses\Queries;

use App\Models\Warehouse;
use Illuminate\Http\Request;

class ListWarehouses
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['name', 'warehouse_type', 'city', 'province', 'sort_order'], true)
            ? $request->query('sort')
            : 'sort_order';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $warehouses = Warehouse::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('warehouse_type', 'like', "%{$search}%")
                        ->orWhere('phone_number', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('street', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhere('province', 'like', "%{$search}%")
                        ->orWhere('zip_code', 'like', "%{$search}%")
                        ->orWhere('country', 'like', "%{$search}%");
                });
            })
            ->orderBy($sort, $direction)
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Warehouse $warehouse) => [
                'id' => $warehouse->id,
                'name' => $warehouse->name,
                'warehouse_type' => $warehouse->warehouse_type,
                'phone_number' => $warehouse->phone_number,
                'email' => $warehouse->email,
                'street' => $warehouse->street,
                'city' => $warehouse->city,
                'province' => $warehouse->province,
                'zip_code' => $warehouse->zip_code,
                'country' => $warehouse->country,
                'latitude' => $warehouse->latitude !== null ? (float) $warehouse->latitude : null,
                'longitude' => $warehouse->longitude !== null ? (float) $warehouse->longitude : null,
                'sort_order' => $warehouse->sort_order,
                'created_at' => optional($warehouse->created_at)?->toDateTimeString(),
                'updated_at' => optional($warehouse->updated_at)?->toDateTimeString(),
            ]);

        return [
            'warehouses' => $warehouses,
            'warehouseTypes' => Warehouse::TYPES,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }
}
