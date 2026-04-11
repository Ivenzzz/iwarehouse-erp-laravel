<?php

namespace App\Features\Customers\Http\Controllers;

use App\Features\Customers\Actions\ExportCustomersCsv;
use App\Features\Customers\Actions\ImportCustomersFromCsv;
use App\Features\Customers\Actions\SaveCustomer;
use App\Features\Customers\Http\Requests\ImportCustomersRequest;
use App\Features\Customers\Http\Requests\SaveCustomerRequest;
use App\Features\Customers\Queries\ListCustomers;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function index(Request $request, ListCustomers $listCustomers): InertiaResponse
    {
        return Inertia::render('Customers', $listCustomers($request));
    }

    public function store(SaveCustomerRequest $request, SaveCustomer $saveCustomer): RedirectResponse
    {
        $saveCustomer->handle($request->payload());

        return redirect()->route('customers.index');
    }

    public function update(
        SaveCustomerRequest $request,
        Customer $customer,
        SaveCustomer $saveCustomer,
    ): RedirectResponse {
        $saveCustomer->handle($request->payload(), $customer);

        return redirect()->route('customers.index');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();

        return redirect()->route('customers.index');
    }

    public function import(
        ImportCustomersRequest $request,
        ImportCustomersFromCsv $importCustomersFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('customers.index')
            ->with('success', $importCustomersFromCsv->handle($request->csvFile()));
    }

    public function export(ExportCustomersCsv $exportCustomersCsv): StreamedResponse
    {
        return $exportCustomersCsv->handle();
    }
}
