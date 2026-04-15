<?php

namespace App\Features\DeliveryReceipts\Queries;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ListDeliveryReceiptVariantOptions
{
    public function __invoke(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['required', 'string', 'min:2', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'mode' => ['nullable', 'string', 'in:supplier,po'],
            'po_id' => ['nullable', 'integer', 'exists:purchase_orders,id'],
        ]);

        $search = trim((string) $validated['search']);
        $tokens = collect(preg_split('/\s+/', mb_strtolower($search)) ?: [])
            ->map(fn ($token) => trim((string) $token))
            ->filter()
            ->values()
            ->all();
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 25);
        $mode = (string) ($validated['mode'] ?? 'supplier');
        $poId = isset($validated['po_id']) ? (int) $validated['po_id'] : null;
        $searchLike = '%'.$search.'%';

        $query = ProductVariant::query()
            ->join('product_masters', 'product_masters.id', '=', 'product_variants.product_master_id')
            ->join('product_models', 'product_models.id', '=', 'product_masters.model_id')
            ->join('product_brands', 'product_brands.id', '=', 'product_models.brand_id')
            ->where('product_variants.is_active', true)
            ->groupBy(
                'product_variants.product_master_id',
                'product_variants.model_code',
                'product_variants.condition',
                'product_variants.ram',
                'product_variants.rom',
                'product_brands.name',
                'product_models.model_name',
                'product_masters.master_sku'
            )
            ->selectRaw('product_variants.product_master_id as product_master_id')
            ->selectRaw("COALESCE(product_variants.model_code, '') as model_code")
            ->selectRaw("COALESCE(product_variants.condition, '') as requested_condition")
            ->selectRaw("COALESCE(product_variants.ram, '') as requested_ram")
            ->selectRaw("COALESCE(product_variants.rom, '') as requested_rom")
            ->selectRaw('product_brands.name as brand_name')
            ->selectRaw('product_models.model_name as product_model')
            ->selectRaw("TRIM(CONCAT_WS(' ', NULLIF(product_brands.name, ''), NULLIF(product_models.model_name, ''))) as product_name")
            ->selectRaw('product_masters.master_sku as master_sku')
            ->selectRaw('COUNT(DISTINCT NULLIF(TRIM(product_variants.color), \'\')) as color_count')
            ->orderBy('brand_name')
            ->orderBy('product_model')
            ->orderBy('model_code')
            ->orderBy('requested_condition')
            ->orderBy('requested_ram')
            ->orderBy('requested_rom');

        if (!empty($tokens)) {
            foreach ($tokens as $token) {
                $like = '%'.$token.'%';
                $query->where(function ($builder) use ($like) {
                    $builder
                        ->whereRaw('LOWER(product_brands.name) like ?', [$like])
                        ->orWhereRaw('LOWER(product_models.model_name) like ?', [$like])
                        ->orWhereRaw('LOWER(product_masters.master_sku) like ?', [$like])
                        ->orWhereRaw('LOWER(product_variants.model_code) like ?', [$like])
                        ->orWhereRaw('LOWER(product_variants.condition) like ?', [$like])
                        ->orWhereRaw('LOWER(product_variants.ram) like ?', [$like])
                        ->orWhereRaw('LOWER(product_variants.rom) like ?', [$like])
                        ->orWhereRaw('LOWER(product_variants.color) like ?', [$like]);
                });
            }

            $strongScoreSql = collect($tokens)
                ->map(fn () => "MAX(CASE WHEN LOWER(product_brands.name) like ? OR LOWER(product_models.model_name) like ? OR LOWER(product_variants.model_code) like ? THEN 1 ELSE 0 END)")
                ->implode(' + ');
            $strongScoreBindings = collect($tokens)
                ->flatMap(fn ($token) => ['%'.$token.'%', '%'.$token.'%', '%'.$token.'%'])
                ->all();

            $weakScoreSql = collect($tokens)
                ->map(fn () => "MAX(CASE WHEN LOWER(product_masters.master_sku) like ? OR LOWER(product_variants.condition) like ? OR LOWER(product_variants.ram) like ? OR LOWER(product_variants.rom) like ? OR LOWER(product_variants.color) like ? THEN 1 ELSE 0 END)")
                ->implode(' + ');
            $weakScoreBindings = collect($tokens)
                ->flatMap(fn ($token) => ['%'.$token.'%', '%'.$token.'%', '%'.$token.'%', '%'.$token.'%', '%'.$token.'%'])
                ->all();

            $query
                ->selectRaw("({$strongScoreSql}) as strong_score", $strongScoreBindings)
                ->selectRaw("({$weakScoreSql}) as weak_score", $weakScoreBindings)
                ->orderByDesc('strong_score')
                ->orderByDesc('weak_score')
                ->orderBy('brand_name')
                ->orderBy('product_model')
                ->orderBy('model_code')
                ->orderBy('requested_condition')
                ->orderBy('requested_ram')
                ->orderBy('requested_rom');
        } else {
            // Defensive fallback for malformed search input after normalization.
            $query->where(function ($builder) use ($searchLike) {
                $builder
                    ->whereRaw('LOWER(product_brands.name) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_models.model_name) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_masters.master_sku) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_variants.model_code) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_variants.condition) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_variants.ram) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_variants.rom) like ?', [mb_strtolower($searchLike)])
                    ->orWhereRaw('LOWER(product_variants.color) like ?', [mb_strtolower($searchLike)]);
            });
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page)->withQueryString();

        $options = collect($paginator->items())
            ->map(function ($row) {
                $brandName = (string) ($row->brand_name ?? '');
                $productModel = (string) ($row->product_model ?? '');
                $modelCode = (string) ($row->model_code ?? '');
                $requestedCondition = (string) ($row->requested_condition ?? '');
                $requestedRam = (string) ($row->requested_ram ?? '');
                $requestedRom = (string) ($row->requested_rom ?? '');

                return [
                    'id' => implode('|', [
                        (string) $row->product_master_id,
                        strtolower(trim($modelCode)),
                        strtolower(trim($requestedCondition)),
                        strtolower(trim($requestedRam)),
                        strtolower(trim($requestedRom)),
                    ]),
                    'product_master_id' => (int) $row->product_master_id,
                    'product_name' => (string) ($row->product_name ?? ''),
                    'product_model' => $productModel,
                    'brand_name' => $brandName,
                    'model_code' => $modelCode,
                    'requested_condition' => $requestedCondition,
                    'requested_ram' => $requestedRam,
                    'requested_rom' => $requestedRom,
                    'master_sku' => (string) ($row->master_sku ?? ''),
                    'color_count' => (int) ($row->color_count ?? 0),
                    'label' => trim(implode(' ', array_filter([$brandName, $productModel, $modelCode]))),
                    'subtitle' => implode(' / ', array_filter([$requestedCondition, $requestedRam, $requestedRom])),
                ];
            })
            ->values()
            ->all();

        return [
            'options' => $options,
            'pagination' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'has_more' => $paginator->currentPage() < $paginator->lastPage(),
            ],
            'filters' => [
                'search' => $search,
                'mode' => $mode,
                'po_id' => $poId,
            ],
        ];
    }
}
