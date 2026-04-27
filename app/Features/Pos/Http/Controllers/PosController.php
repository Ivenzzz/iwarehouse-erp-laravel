<?php

namespace App\Features\Pos\Http\Controllers;

use App\Features\Pos\Actions\ClosePosSession;
use App\Features\Pos\Actions\CreatePosCustomer;
use App\Features\Pos\Actions\CreatePosSalesRep;
use App\Features\Pos\Actions\CreatePosSession;
use App\Features\Pos\Actions\CreatePosTransaction;
use App\Features\Pos\Actions\StorePosUpload;
use App\Features\Pos\Actions\VerifyPosDiscountOic;
use App\Features\Pos\Http\Requests\ClosePosSessionRequest;
use App\Features\Pos\Http\Requests\StorePosDiscountAuthorizationRequest;
use App\Features\Pos\Http\Requests\StorePosCustomerRequest;
use App\Features\Pos\Http\Requests\StorePosSalesRepRequest;
use App\Features\Pos\Http\Requests\StorePosSessionRequest;
use App\Features\Pos\Http\Requests\StorePosTransactionRequest;
use App\Features\Pos\Queries\ListPosPageData;
use App\Features\Pos\Queries\SearchPosPriceCheck;
use App\Features\Pos\Queries\ListPosTransactions;
use App\Features\Pos\Queries\SearchPosInventory;
use App\Features\Pos\Support\PosDataTransformer;
use App\Features\Pos\Support\ResolvesCashier;
use App\Http\Controllers\Controller;
use App\Models\PosSession;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use InvalidArgumentException;

class PosController extends Controller
{
    private const TRANSACTION_NUMBER_CONFLICT_MESSAGE = 'Transaction number conflict. Please retry.';

    public function index(Request $request, ListPosPageData $listPosPageData): InertiaResponse
    {
        return Inertia::render('POS', $listPosPageData($request));
    }

    public function inventorySearch(Request $request, SearchPosInventory $searchPosInventory): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['required', 'string'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        return response()->json(
            $searchPosInventory->handle(
                $validated['search'],
                (int) $validated['warehouse_id'],
                (int) ($validated['limit'] ?? 20),
            ),
        );
    }

    public function priceCheckSearch(Request $request, SearchPosPriceCheck $searchPosPriceCheck): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['required', 'string'],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
        ]);

        return response()->json(
            $searchPosPriceCheck->handle(
                $validated['search'],
                isset($validated['warehouse_id']) ? (int) $validated['warehouse_id'] : null,
            ),
        );
    }

    public function transactionNumberPreview(PosDataTransformer $transformer): JsonResponse
    {
        return response()->json([
            'transaction_number' => $transformer->nextTransactionNumberPreview(),
        ]);
    }

    public function transactions(Request $request, ListPosTransactions $listPosTransactions): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => ['required', 'integer', 'exists:pos_sessions,id'],
        ]);

        return response()->json([
            'rows' => $listPosTransactions->handle((int) $validated['session_id']),
        ]);
    }

    public function storeSession(
        StorePosSessionRequest $request,
        ResolvesCashier $resolvesCashier,
        CreatePosSession $createPosSession,
        PosDataTransformer $transformer,
    ): JsonResponse {
        $resolvedCashier = $resolvesCashier->resolve($request->user());

        $session = $createPosSession->handle(
            $resolvedCashier['user'],
            (int) $request->validated('warehouse_id'),
            (float) $request->validated('opening_balance'),
        );

        return response()->json([
            'session' => $transformer->transformActiveSession($session->fresh(['warehouse', 'user'])),
        ]);
    }

    public function closeSession(
        ClosePosSessionRequest $request,
        PosSession $posSession,
        ClosePosSession $closePosSession,
        PosDataTransformer $transformer,
    ): JsonResponse {
        $session = $closePosSession->handle(
            $posSession,
            (float) $request->validated('closing_balance'),
            $request->validated('cashier_remarks'),
        );

        return response()->json([
            'session' => $transformer->transformActiveSession($session),
        ]);
    }

    public function storeCustomer(
        StorePosCustomerRequest $request,
        CreatePosCustomer $createPosCustomer,
        PosDataTransformer $transformer,
    ): JsonResponse {
        $customer = $createPosCustomer->handle($request->validated());

        return response()->json([
            'customer' => $transformer->transformCustomer($customer),
        ]);
    }

    public function storeSalesRep(
        StorePosSalesRepRequest $request,
        CreatePosSalesRep $createPosSalesRep,
        PosDataTransformer $transformer,
    ): JsonResponse {
        try {
            $employee = $createPosSalesRep->handle(
                $request->validated('first_name'),
                $request->validated('last_name'),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'salesRep' => $transformer->transformSalesRep($employee),
        ]);
    }

    public function verifyDiscountOic(
        StorePosDiscountAuthorizationRequest $request,
        VerifyPosDiscountOic $verifyPosDiscountOic,
    ): JsonResponse {
        $employee = $verifyPosDiscountOic->handle($request->validated('pin'));

        if ($employee === null) {
            return response()->json([
                'message' => 'Invalid OIC PIN.',
            ], 422);
        }

        return response()->json([
            'authorized' => true,
            'employee' => [
                'id' => $employee->id,
                'full_name' => trim(implode(' ', array_filter([
                    $employee->first_name,
                    $employee->middle_name,
                    $employee->last_name,
                ]))),
            ],
        ]);
    }

    public function storeTransaction(
        StorePosTransactionRequest $request,
        CreatePosTransaction $createPosTransaction,
    ): JsonResponse {
        try {
            $transaction = $createPosTransaction->handle($request->validated(), $request->user()?->id);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        } catch (QueryException $exception) {
            if ($this->isTransactionNumberUniqueConstraintViolation($exception)) {
                return response()->json([
                    'message' => self::TRANSACTION_NUMBER_CONFLICT_MESSAGE,
                ], 422);
            }

            throw $exception;
        }

        return response()->json([
            'transaction' => $transaction,
        ]);
    }

    public function upload(Request $request, StorePosUpload $storePosUpload): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return response()->json($storePosUpload->handle($validated['file']));
    }

    private function isTransactionNumberUniqueConstraintViolation(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'uq_sales_transactions_transaction_number')
            || str_contains($message, 'sales_transactions.transaction_number');
    }
}
