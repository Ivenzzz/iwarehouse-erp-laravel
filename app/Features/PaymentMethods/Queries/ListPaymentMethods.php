<?php

namespace App\Features\PaymentMethods\Queries;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;

class ListPaymentMethods
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['name', 'type'], true)
            ? $request->query('sort')
            : 'name';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';

        $paymentMethods = PaymentMethod::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%")
                        ->orWhere('logo', 'like', "%{$search}%");
                });
            })
            ->orderBy($sort, $direction)
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (PaymentMethod $paymentMethod) => [
                'id' => $paymentMethod->id,
                'name' => $paymentMethod->name,
                'type' => $paymentMethod->type,
                'logo' => $paymentMethod->logo,
                'created_at' => optional($paymentMethod->created_at)?->toDateTimeString(),
                'updated_at' => optional($paymentMethod->updated_at)?->toDateTimeString(),
            ]);

        return [
            'paymentMethods' => $paymentMethods,
            'paymentMethodTypes' => PaymentMethod::TYPES,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }
}
