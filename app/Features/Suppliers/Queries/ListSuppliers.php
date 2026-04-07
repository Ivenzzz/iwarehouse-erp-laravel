<?php

namespace App\Features\Suppliers\Queries;

use App\Models\Supplier;
use Illuminate\Http\Request;

class ListSuppliers
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['supplier_code', 'legal_business_name', 'trade_name', 'status'], true)
            ? $request->query('sort')
            : 'supplier_code';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $suppliers = Supplier::query()
            ->with('contact')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('supplier_code', 'like', "%{$search}%")
                        ->orWhere('legal_business_name', 'like', "%{$search}%")
                        ->orWhere('trade_name', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%")
                        ->orWhereHas('contact', function ($query) use ($search) {
                            $query
                                ->where('email', 'like', "%{$search}%")
                                ->orWhere('mobile', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sort, $direction)
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Supplier $supplier) => $this->transform($supplier));

        return [
            'suppliers' => $suppliers,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }

    private function transform(Supplier $supplier): array
    {
        return [
            'id' => $supplier->id,
            'supplier_code' => $supplier->supplier_code,
            'legal_business_name' => $supplier->legal_business_name,
            'trade_name' => $supplier->trade_name,
            'address' => $supplier->address,
            'status' => $supplier->status,
            'email' => $supplier->contact?->email,
            'mobile' => $supplier->contact?->mobile,
            'created_at' => optional($supplier->created_at)?->toDateTimeString(),
            'updated_at' => optional($supplier->updated_at)?->toDateTimeString(),
        ];
    }
}
