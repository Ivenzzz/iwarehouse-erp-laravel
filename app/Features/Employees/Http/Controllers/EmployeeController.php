<?php

namespace App\Features\Employees\Http\Controllers;

use App\Features\Employees\Actions\ExportEmployeesCsv;
use App\Features\Employees\Actions\ImportEmployeesFromCsv;
use App\Features\Employees\Actions\SaveEmployee;
use App\Features\Employees\Http\Requests\ImportEmployeesRequest;
use App\Features\Employees\Http\Requests\SaveEmployeeRequest;
use App\Features\Employees\Queries\ListEmployees;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeController extends Controller
{
    public function index(Request $request, ListEmployees $listEmployees): InertiaResponse
    {
        return Inertia::render('Employees', $listEmployees($request));
    }

    public function store(SaveEmployeeRequest $request, SaveEmployee $saveEmployee): RedirectResponse
    {
        $saveEmployee->handle($request->payload());

        return redirect()->route('employees.index');
    }

    public function update(
        SaveEmployeeRequest $request,
        Employee $employee,
        SaveEmployee $saveEmployee,
    ): RedirectResponse {
        $saveEmployee->handle($request->payload(), $employee);

        return redirect()->route('employees.index');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        try {
            $employee->delete();
        } catch (QueryException) {
            return redirect()
                ->route('employees.index')
                ->withErrors([
                    'employee' => 'This employee cannot be deleted because it is referenced by other records.',
                ]);
        }

        return redirect()->route('employees.index');
    }

    public function import(
        ImportEmployeesRequest $request,
        ImportEmployeesFromCsv $importEmployeesFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('employees.index')
            ->with('success', $importEmployeesFromCsv->handle($request->csvFile()));
    }

    public function export(ExportEmployeesCsv $exportEmployeesCsv): StreamedResponse
    {
        return $exportEmployeesCsv->handle();
    }
}
