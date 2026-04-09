<?php

namespace App\Features\Pos\Queries;

use App\Features\Pos\Support\PosDataTransformer;
use App\Features\Pos\Support\ResolvesCashier;
use App\Models\CompanyInfo;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\PaymentMethod;
use App\Models\PosSession;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class ListPosPageData
{
    public function __construct(
        private readonly ResolvesCashier $resolvesCashier,
        private readonly PosDataTransformer $transformer,
    ) {
    }

    public function __invoke(Request $request): array
    {
        $resolvedCashier = $this->resolvesCashier->resolve($request->user());
        /** @var \App\Models\Employee|null $employee */
        $employee = $resolvedCashier['employee'];

        $activeSession = $employee
            ? PosSession::query()
                ->with(['warehouse', 'employee'])
                ->where('employee_id', $employee->id)
                ->where('status', PosSession::STATUS_OPENED)
                ->latest('id')
                ->first()
            : null
            ;

        $customers = Customer::query()
            ->with([
                'contacts' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
                'addresses' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('id'),
                'salesTransactions.items.inventoryItem.productVariant.productMaster.model.brand',
            ])
            ->orderByDesc('id')
            ->get();

        $salesReps = Employee::query()
            ->with('jobTitle.department')
            ->where('status', Employee::STATUS_ACTIVE)
            ->whereHas('jobTitle.department', fn ($query) => $query->whereRaw('LOWER(name) = ?', ['sales']))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return [
            'cashier' => $this->transformer->transformCashier($request->user(), $employee, $resolvedCashier['error']),
            'activeSession' => $this->transformer->transformActiveSession($activeSession),
            'warehouses' => Warehouse::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (Warehouse $warehouse) => $this->transformer->transformWarehouse($warehouse))
                ->values(),
            'customers' => $customers
                ->map(fn (Customer $customer) => $this->transformer->transformCustomer($customer))
                ->values(),
            'salesReps' => $salesReps
                ->map(fn (Employee $employee) => $this->transformer->transformSalesRep($employee))
                ->values(),
            'paymentMethods' => PaymentMethod::query()
                ->orderBy('name')
                ->get()
                ->map(fn (PaymentMethod $paymentMethod) => $this->transformer->transformPaymentMethod($paymentMethod))
                ->values(),
            'companyInfo' => [
                $this->transformer->transformCompanyInfo(CompanyInfo::query()->latest('id')->first()),
            ],
            'nextTransactionNumberPreview' => $this->transformer->nextTransactionNumberPreview(),
        ];
    }
}
