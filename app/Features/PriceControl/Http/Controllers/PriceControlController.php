<?php

namespace App\Features\PriceControl\Http\Controllers;

use App\Features\PriceControl\Actions\ExportPriceControlCsv;
use App\Features\PriceControl\Actions\PreviewPriceControlUpdate;
use App\Features\PriceControl\Actions\UpdatePriceControlPrices;
use App\Features\PriceControl\Queries\ListPriceControlPageData;
use App\Features\PriceControl\Queries\ListPriceControlVariants;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PriceControlController extends Controller
{
    public function index(Request $request, ListPriceControlPageData $listPriceControlPageData): InertiaResponse
    {
        return Inertia::render('PriceControl', $listPriceControlPageData($request));
    }

    public function variants(Request $request, ListPriceControlVariants $listPriceControlVariants): JsonResponse
    {
        return response()->json($listPriceControlVariants($request));
    }

    public function preview(Request $request, PreviewPriceControlUpdate $previewPriceControlUpdate): JsonResponse
    {
        $validated = $this->validatePricePayload($request);

        return response()->json($previewPriceControlUpdate->handle(
            array_map('intval', $validated['itemIds']),
            $this->nullableFloat($validated['newCashPrice'] ?? null),
            $this->nullableFloat($validated['newSrp'] ?? null),
        ));
    }

    public function update(Request $request, UpdatePriceControlPrices $updatePriceControlPrices): JsonResponse
    {
        $validated = $this->validatePricePayload($request);

        return response()->json($updatePriceControlPrices->handle(
            array_map('intval', $validated['itemIds']),
            $this->nullableFloat($validated['newCashPrice'] ?? null),
            $this->nullableFloat($validated['newSrp'] ?? null),
            $request->user()?->id,
        ));
    }

    public function export(Request $request, ExportPriceControlCsv $exportPriceControlCsv): StreamedResponse
    {
        return $exportPriceControlCsv->handle($request);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePricePayload(Request $request): array
    {
        $validated = $request->validate([
            'itemIds' => ['required', 'array', 'min:1'],
            'itemIds.*' => ['integer', 'min:1'],
            'newCashPrice' => ['nullable', 'numeric', 'min:0', 'required_without:newSrp'],
            'newSrp' => ['nullable', 'numeric', 'min:0', 'required_without:newCashPrice'],
        ]);

        return $validated;
    }

    private function nullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }
}
