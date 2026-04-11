<?php

namespace App\Features\Customers\Queries;

use App\Features\Customers\Support\CustomerStatuses;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\CustomerType;
use Illuminate\Http\Request;

class ListCustomers
{
    public function __invoke(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $sort = in_array($request->query('sort'), ['customer_code', 'name', 'customer_kind', 'group', 'type', 'status'], true)
            ? $request->query('sort')
            : 'customer_code';
        $direction = $request->query('direction') === 'desc' ? 'desc' : 'asc';
        $status = in_array($request->query('status'), CustomerStatuses::values(), true)
            ? $request->query('status')
            : '';
        $customerKind = in_array($request->query('customer_kind'), [Customer::KIND_PERSON, Customer::KIND_ORGANIZATION], true)
            ? $request->query('customer_kind')
            : '';
        $customerGroupId = $this->integerFilter($request->query('customer_group_id'));
        $customerTypeId = $this->integerFilter($request->query('customer_type_id'));

        $query = Customer::query()
            ->with([
                'group',
                'type',
                'contacts' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
                'addresses' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('customer_code', 'like', "%{$search}%")
                        ->orWhere('firstname', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%")
                        ->orWhere(function ($query) use ($search) {
                            $query
                                ->where('firstname', 'like', "%{$search}%")
                                ->where('lastname', 'like', "%{$search}%");
                        })
                        ->orWhere('organization_name', 'like', "%{$search}%")
                        ->orWhere('legal_name', 'like', "%{$search}%")
                        ->orWhere('tax_id', 'like', "%{$search}%")
                        ->orWhereHas('contacts', function ($query) use ($search) {
                            $query
                                ->where('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($customerKind !== '', fn ($query) => $query->where('customer_kind', $customerKind))
            ->when($customerGroupId !== null, fn ($query) => $query->where('customer_group_id', $customerGroupId))
            ->when($customerTypeId !== null, fn ($query) => $query->where('customer_type_id', $customerTypeId));

        match ($sort) {
            'name' => $query
                ->orderByRaw("COALESCE(organization_name, lastname, '') {$direction}")
                ->orderBy('firstname', $direction),
            'group' => $query
                ->join('customer_groups', 'customer_groups.id', '=', 'customers.customer_group_id')
                ->select('customers.*')
                ->orderBy('customer_groups.name', $direction),
            'type' => $query
                ->join('customer_types', 'customer_types.id', '=', 'customers.customer_type_id')
                ->select('customers.*')
                ->orderBy('customer_types.name', $direction),
            default => $query->orderBy("customers.{$sort}", $direction),
        };

        return [
            'customers' => $query
                ->paginate(10)
                ->withQueryString()
                ->through(fn (Customer $customer) => $this->transform($customer)),
            'customerGroups' => CustomerGroup::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'customerTypes' => CustomerType::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'statuses' => CustomerStatuses::values(),
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'direction' => $direction,
                'status' => $status,
                'customer_kind' => $customerKind,
                'customer_group_id' => $customerGroupId ? (string) $customerGroupId : '',
                'customer_type_id' => $customerTypeId ? (string) $customerTypeId : '',
            ],
        ];
    }

    private function transform(Customer $customer): array
    {
        $contact = $customer->contacts->first();
        $address = $customer->addresses->first();

        return [
            'id' => $customer->id,
            'customer_code' => $customer->customer_code,
            'customer_kind' => $customer->customer_kind,
            'firstname' => $customer->firstname,
            'lastname' => $customer->lastname,
            'organization_name' => $customer->organization_name,
            'legal_name' => $customer->legal_name,
            'tax_id' => $customer->tax_id,
            'date_of_birth' => optional($customer->date_of_birth)?->toDateString(),
            'customer_group_id' => $customer->customer_group_id,
            'customer_type_id' => $customer->customer_type_id,
            'status' => $customer->status,
            'display_name' => $this->displayName($customer),
            'group' => [
                'id' => $customer->group?->id,
                'name' => $customer->group?->name,
            ],
            'type' => [
                'id' => $customer->type?->id,
                'name' => $customer->type?->name,
            ],
            'contact' => [
                'firstname' => $contact?->firstname,
                'lastname' => $contact?->lastname,
                'email' => $contact?->email,
                'phone' => $contact?->phone,
            ],
            'address' => [
                'country' => $address?->country ?? 'PH',
                'region' => $address?->region,
                'province' => $address?->province,
                'city_municipality' => $address?->city_municipality,
                'barangay' => $address?->barangay,
                'postal_code' => $address?->postal_code,
                'street' => $address?->street,
            ],
            'created_at' => optional($customer->created_at)?->toDateTimeString(),
            'updated_at' => optional($customer->updated_at)?->toDateTimeString(),
        ];
    }

    private function displayName(Customer $customer): string
    {
        if ($customer->customer_kind === Customer::KIND_ORGANIZATION) {
            return (string) ($customer->organization_name ?: $customer->legal_name);
        }

        return trim($customer->firstname.' '.$customer->lastname);
    }

    private function integerFilter(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_INT) ? (int) $value : null;
    }
}
