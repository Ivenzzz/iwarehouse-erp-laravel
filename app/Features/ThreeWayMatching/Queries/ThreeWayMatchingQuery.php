<?php

namespace App\Features\ThreeWayMatching\Queries;

use App\Features\PurchaseOrders\Support\PurchaseOrderDataTransformer;
use App\Models\DeliveryReceipt;
use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;
use Illuminate\Support\Collection;

class ThreeWayMatchingQuery
{
    public function pageData(array $filters): array
    {
        $matches = $this->matchesForStatus($filters['status']);
        $total = $matches->count();
        $perPage = max(1, (int) $filters['per_page']);
        $page = max(1, (int) $filters['page']);
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);
        $offset = ($page - 1) * $perPage;

        $pagedMatches = $matches->slice($offset, $perPage)->values();
        $selectedMatch = $this->resolveSelectedMatch($matches, $filters['selected_match_id'] ?? null, $pagedMatches);

        return [
            'matches' => $pagedMatches->all(),
            'selectedMatch' => $selectedMatch,
            'counts' => $this->buildCounts($matches),
            'filters' => [
                'status' => $filters['status'],
                'page' => $page,
                'per_page' => $perPage,
                'selected_match_id' => $selectedMatch['id'] ?? null,
            ],
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => $lastPage,
            ],
        ];
    }

    public function matchesForStatus(string $status): Collection
    {
        $allMatches = $this->buildMatches();

        if ($status === ThreeWayMatchingFilters::STATUS_PAID) {
            return $allMatches->where('isPaid', true)->values();
        }

        return $allMatches->where('isPaid', false)->values();
    }

    private function buildMatches(): Collection
    {
        $purchaseOrders = PurchaseOrder::query()
            ->with(array_merge(PurchaseOrderDataTransformer::RELATIONS, [
                'payable.paidBy:id,name,email',
                'payable.documents:id,purchase_order_payable_id,document_url,document_name,created_at',
            ]))
            ->orderByDesc('created_at')
            ->get();

        $poIds = $purchaseOrders->pluck('id')->all();

        $deliveryReceipts = DeliveryReceipt::query()
            ->whereIn('po_id', $poIds)
            ->with([
                'items.spec:id,delivery_receipt_item_id,model_code,ram,rom,condition',
                'items.productMaster.model.brand:id,name',
            ])
            ->get()
            ->groupBy('po_id');

        $deliveryReceiptIds = $deliveryReceipts->flatten()->pluck('id')->all();

        $goodsReceipts = GoodsReceipt::query()
            ->whereIn('delivery_receipt_id', $deliveryReceiptIds)
            ->with([
                'items.identifiers:id,goods_receipt_item_id,serial_number,imei1,imei2',
                'items.details:id,goods_receipt_item_id,item_notes',
                'items.productVariant:id,product_master_id,condition,ram,rom,model_code',
                'items.productVariant.productMaster.model.brand:id,name',
            ])
            ->get()
            ->groupBy('delivery_receipt_id');

        return $purchaseOrders->map(function (PurchaseOrder $po) use ($deliveryReceipts, $goodsReceipts): array {
            $linkedReceipts = $deliveryReceipts->get($po->id, collect());
            [$invoiceRecord, $additionalInvoiceCount] = $this->latestRecordWithAdditionalCount($linkedReceipts);

            $linkedGrns = $invoiceRecord
                ? $goodsReceipts->get($invoiceRecord->id, collect())
                : collect();
            [$goodsReceipt, $additionalGRNCount] = $this->latestRecordWithAdditionalCount($linkedGrns);

            [$lines, $failedLineCount] = $this->buildComparisonLines($po, $invoiceRecord, $goodsReceipt);

            $documentWarnings = [];
            if ($additionalInvoiceCount > 0) {
                $documentWarnings[] = "Using latest delivery receipt. {$additionalInvoiceCount} older linked invoice record(s) also exist.";
            }
            if ($additionalGRNCount > 0) {
                $documentWarnings[] = "Using latest goods receipt. {$additionalGRNCount} older linked GRN record(s) also exist.";
            }
            if (! $invoiceRecord) {
                $documentWarnings[] = 'Waiting for billed document (delivery receipt) to be linked to this PO.';
            }
            if ($invoiceRecord && ! $goodsReceipt) {
                $documentWarnings[] = 'Waiting for goods receipt to confirm what was actually received.';
            }

            $poSubtotal = (float) ($po->items->sum(function ($item) {
                $gross = (float) $item->quantity * (float) $item->unit_price;
                $discountPercent = min(100, max(0, (float) $item->discount));

                return max(0, $gross * (1 - ($discountPercent / 100)));
            }));
            $poTotal = $poSubtotal + (float) ($po->shipping_amount ?? 0);

            $invoiceTotal = (float) ($invoiceRecord?->dr_value ?? 0);
            if ($invoiceTotal <= 0) {
                $invoiceTotal = (float) collect($lines)->sum(fn (array $line) => (float) ($line['invoiceAmount'] ?? 0));
            }
            $hasTotalWarning = $invoiceRecord !== null && ! $this->areAmountsEqual($poSubtotal, $invoiceTotal);

            $status = 'matched';
            if (! $invoiceRecord || ! $goodsReceipt) {
                $status = 'pending';
            } elseif ($failedLineCount > 0) {
                $status = 'discrepancy';
            }

            $payable = $po->payable;
            $latestDocument = $payable?->documents?->first();
            $isPaid = (bool) ($payable?->has_paid ?? false);
            $paymentState = $isPaid ? 'paid' : ($status === 'matched' ? 'ready' : 'blocked');

            return [
                'id' => $po->id,
                'po' => [
                    'id' => $po->id,
                    'po_number' => $po->po_number,
                    'expected_delivery_date' => optional($po->expected_delivery_date)?->toDateString(),
                ],
                'supplierName' => $this->supplierName($po),
                'invoiceRecord' => $invoiceRecord ? $this->transformInvoiceRecord($invoiceRecord) : null,
                'goodsReceipt' => $goodsReceipt ? $this->transformGoodsReceipt($goodsReceipt) : null,
                'lines' => $lines,
                'discrepancyCount' => $failedLineCount,
                'documentWarnings' => $documentWarnings,
                'status' => $status,
                'canMarkAsPaid' => $status === 'matched',
                'paymentState' => $paymentState,
                'payable' => [
                    'has_paid' => $isPaid,
                    'paid_by' => $payable?->paidBy?->name ?? $payable?->paidBy?->email,
                    'paid_date' => optional($payable?->paid_at)?->toIso8601String(),
                    'notes' => $payable?->notes,
                    'attached_documents' => $latestDocument ? [
                        'document_url' => $latestDocument->document_url,
                        'document_name' => $latestDocument->document_name,
                    ] : null,
                ],
                'isPaid' => $isPaid,
                'totals' => [
                    'poSubtotal' => $poSubtotal,
                    'poTotal' => $poTotal,
                    'invoiceTotal' => $invoiceTotal,
                    'hasTotalWarning' => $hasTotalWarning,
                    'delta' => $invoiceTotal - $poSubtotal,
                ],
            ];
        })->values();
    }

    private function resolveSelectedMatch(Collection $allMatches, ?int $selectedMatchId, Collection $pageMatches): ?array
    {
        if ($allMatches->isEmpty()) {
            return null;
        }

        if ($selectedMatchId !== null) {
            $selected = $allMatches->firstWhere('id', $selectedMatchId);
            if ($selected !== null) {
                return $selected;
            }
        }

        return $pageMatches->first() ?? $allMatches->first();
    }

    private function buildCounts(Collection $allMatches): array
    {
        $pendingCount = $allMatches->where('status', 'pending')->count();
        $matchedCount = $allMatches->where('status', 'matched')->count();
        $discrepancyCount = $allMatches->where('status', 'discrepancy')->count();
        $paidCount = $allMatches->where('isPaid', true)->count();
        $readyToPayCount = $allMatches->where('paymentState', 'ready')->count();
        $matchRate = $allMatches->count() > 0 ? (int) round(($matchedCount / $allMatches->count()) * 100) : 0;

        return compact('pendingCount', 'matchedCount', 'discrepancyCount', 'paidCount', 'readyToPayCount', 'matchRate');
    }

    private function latestRecordWithAdditionalCount(Collection $records): array
    {
        if ($records->isEmpty()) {
            return [null, 0];
        }

        $sorted = $records->sortByDesc(function ($record) {
            $candidates = [
                $record->updated_at,
                $record->created_at,
                $record->date_encoded,
                $record->date_received,
            ];

            foreach ($candidates as $candidate) {
                if ($candidate !== null) {
                    return strtotime((string) $candidate);
                }
            }

            return 0;
        })->values();

        return [$sorted->first(), max(0, $sorted->count() - 1)];
    }

    private function buildComparisonLines(PurchaseOrder $po, ?DeliveryReceipt $invoiceRecord, ?GoodsReceipt $goodsReceipt): array
    {
        $poLines = $this->buildPOLines($po);
        $invoiceLines = $this->buildInvoiceLines($invoiceRecord);
        $grnLines = $this->buildGrnLines($goodsReceipt);

        $allKeys = collect(array_unique(array_merge(array_keys($poLines), array_keys($invoiceLines), array_keys($grnLines))));

        $lines = $allKeys->map(function (string $key) use ($poLines, $invoiceLines, $grnLines): array {
            $poLine = $poLines[$key] ?? null;
            $invoiceLine = $invoiceLines[$key] ?? null;
            $grnLine = $grnLines[$key] ?? null;
            $issues = [];

            $identityStatus = $poLine && $invoiceLine && $grnLine ? 'pass' : 'fail';
            if (! $poLine) {
                $issues[] = 'Item exists on invoice or goods receipt but not on purchase order.';
            }
            if (! $invoiceLine) {
                $issues[] = 'Item missing from billed document.';
            }
            if (! $grnLine) {
                $issues[] = 'Item missing from goods receipt.';
            }

            $quantityStatus = 'na';
            if ($invoiceLine) {
                $quantityStatus = $grnLine && $invoiceLine['quantity'] <= $grnLine['quantity'] ? 'pass' : 'fail';
                if ($grnLine && $invoiceLine['quantity'] > $grnLine['quantity']) {
                    $issues[] = sprintf(
                        'Invoice quantity %s exceeds received quantity %s.',
                        $this->formatQuantity($invoiceLine['quantity']),
                        $this->formatQuantity($grnLine['quantity'])
                    );
                }
            }

            $priceStatus = 'na';
            if ($invoiceLine) {
                $priceStatus = $poLine && $this->areAmountsEqual($invoiceLine['unitPrice'], $poLine['unitPrice']) ? 'pass' : 'fail';
                if ($poLine && ! $this->areAmountsEqual($invoiceLine['unitPrice'], $poLine['unitPrice'])) {
                    $issues[] = sprintf(
                        'Invoice price %s does not match PO price %s.',
                        $this->formatMoney($invoiceLine['unitPrice']),
                        $this->formatMoney($poLine['unitPrice'])
                    );
                }
            }

            return [
                'key' => $key,
                'label' => $invoiceLine['label'] ?? $poLine['label'] ?? $grnLine['label'] ?? 'Unknown Item',
                'poLabel' => $poLine['label'] ?? 'Missing on PO',
                'grnLabel' => $grnLine['label'] ?? 'Missing on GR',
                'invoiceLabel' => $invoiceLine['label'] ?? 'Missing on invoice',
                'poSpec' => $poLine['spec'] ?? null,
                'grnSpec' => $grnLine['spec'] ?? null,
                'invoiceSpec' => $invoiceLine['spec'] ?? null,
                'poAmount' => $poLine['amount'] ?? 0,
                'invoiceAmount' => $invoiceLine['amount'] ?? 0,
                'poQuantity' => $poLine['quantity'] ?? 0,
                'grnQuantity' => $grnLine['quantity'] ?? 0,
                'invoiceQuantity' => $invoiceLine['quantity'] ?? 0,
                'poPrice' => $poLine['unitPrice'] ?? null,
                'invoicePrice' => $invoiceLine['unitPrice'] ?? null,
                'quantityVariance' => $invoiceLine ? ($invoiceLine['quantity'] ?? 0) - ($grnLine['quantity'] ?? 0) : null,
                'priceVariance' => ($invoiceLine && $poLine && isset($invoiceLine['unitPrice'], $poLine['unitPrice']))
                    ? (float) $invoiceLine['unitPrice'] - (float) $poLine['unitPrice']
                    : null,
                'hasPOLine' => $poLine !== null,
                'hasGRNLine' => $grnLine !== null,
                'hasInvoiceLine' => $invoiceLine !== null,
                'identityStatus' => $identityStatus,
                'quantityStatus' => $quantityStatus,
                'priceStatus' => $priceStatus,
                'issues' => $issues,
                'status' => count($issues) === 0 ? 'matched' : 'discrepancy',
                'conditionLabel' => $invoiceLine['spec']['condition'] ?? $poLine['spec']['condition'] ?? $grnLine['spec']['condition'] ?? 'Unknown Condition',
                'poSpecSummary' => $this->buildSpecSummary($poLine['spec'] ?? []),
                'grnSpecSummary' => $this->buildSpecSummary($grnLine['spec'] ?? []),
                'invoiceSpecSummary' => $this->buildSpecSummary($invoiceLine['spec'] ?? []),
                'grnAmount' => isset($poLine['unitPrice'])
                    ? ((float) $poLine['unitPrice']) * (float) ($grnLine['quantity'] ?? 0)
                    : null,
            ];
        })->sortBy('label', SORT_NATURAL | SORT_FLAG_CASE)->values();

        return [$lines->all(), $lines->where('status', 'discrepancy')->count()];
    }

    private function buildPOLines(PurchaseOrder $po): array
    {
        $lineMap = [];

        foreach ($po->items as $item) {
            $spec = [
                'ram' => (string) ($item->spec?->ram ?? ''),
                'rom' => (string) ($item->spec?->rom ?? ''),
                'condition' => (string) ($item->spec?->condition ?? ''),
            ];
            $key = $this->buildNormalizedItemKey((string) $item->product_master_id, $spec, (string) ($item->description ?? ''), $this->productName($item->productMaster));
            $this->addLine($lineMap, [
                'key' => $key,
                'label' => $this->buildItemLabel($item->productMaster?->model?->brand?->name, $item->productMaster?->model?->model_name, $item->description, $spec),
                'quantity' => (float) $item->quantity,
                'unitPrice' => (float) $item->unit_price,
                'amount' => $this->calculatePurchaseOrderLineAmount((float) $item->quantity, (float) $item->unit_price, (float) $item->discount),
                'spec' => $spec,
            ]);
        }

        return $lineMap;
    }

    private function buildInvoiceLines(?DeliveryReceipt $deliveryReceipt): array
    {
        if (! $deliveryReceipt) {
            return [];
        }

        $lineMap = [];
        foreach ($deliveryReceipt->items as $item) {
            $spec = [
                'ram' => (string) ($item->spec?->ram ?? ''),
                'rom' => (string) ($item->spec?->rom ?? ''),
                'condition' => (string) ($item->spec?->condition ?? ''),
            ];
            $quantity = (float) ($item->actual_quantity ?: $item->expected_quantity ?: 0);
            $unitPrice = (float) ($item->unit_cost ?? 0);
            $key = $this->buildNormalizedItemKey((string) $item->product_master_id, $spec, (string) ($item->variance_notes ?? ''), $this->productName($item->productMaster));

            $this->addLine($lineMap, [
                'key' => $key,
                'label' => $this->buildItemLabel($item->productMaster?->model?->brand?->name, $item->productMaster?->model?->model_name, $item->variance_notes, $spec),
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'amount' => (float) ($item->total_value ?: ($quantity * $unitPrice)),
                'spec' => $spec,
            ]);
        }

        return $lineMap;
    }

    private function buildGrnLines(?GoodsReceipt $goodsReceipt): array
    {
        if (! $goodsReceipt) {
            return [];
        }

        $lineMap = [];
        foreach ($goodsReceipt->items as $item) {
            $variant = $item->productVariant;
            $productMaster = $variant?->productMaster;
            $spec = [
                'ram' => (string) ($variant?->ram ?? ''),
                'rom' => (string) ($variant?->rom ?? ''),
                'condition' => (string) ($variant?->condition ?? ''),
            ];

            $quantity = $this->grnQuantity($item);
            if ($quantity <= 0) {
                continue;
            }

            $productMasterId = (string) ($variant?->product_master_id ?? '');
            $itemNotes = (string) ($item->details?->item_notes ?? '');
            $key = $this->buildNormalizedItemKey($productMasterId, $spec, $itemNotes, $this->productName($productMaster));

            $this->addLine($lineMap, [
                'key' => $key,
                'label' => $this->buildItemLabel($productMaster?->model?->brand?->name, $productMaster?->model?->model_name, $itemNotes, $spec),
                'quantity' => $quantity,
                'unitPrice' => null,
                'amount' => 0,
                'spec' => $spec,
            ]);
        }

        return $lineMap;
    }

    private function addLine(array &$lineMap, array $line): void
    {
        $existing = $lineMap[$line['key']] ?? null;
        if ($existing !== null) {
            $existing['quantity'] += (float) $line['quantity'];
            $existing['amount'] += (float) $line['amount'];
            $lineMap[$line['key']] = $existing;

            return;
        }

        $lineMap[$line['key']] = $line;
    }

    private function buildNormalizedItemKey(string $productMasterId, array $spec, string $description, string $productName): string
    {
        $ram = $this->normalizeSpecPart($spec['ram'] ?? '');
        $rom = $this->normalizeSpecPart($spec['rom'] ?? '');
        $condition = $this->normalizeSpecPart($spec['condition'] ?? '');

        if ($productMasterId !== '' || $ram !== '' || $rom !== '' || $condition !== '') {
            return implode('|', [
                $productMasterId,
                '',
                $condition,
                $ram,
                $rom,
            ]);
        }

        return 'text::'.$this->normalizeText(trim($productName.' '.$description));
    }

    private function normalizeSpecPart(string $value): string
    {
        return strtolower(trim($value));
    }

    private function normalizeText(string $value): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($value))) ?? '';
    }

    private function productName($productMaster): string
    {
        if (! $productMaster) {
            return 'Unknown Product';
        }

        $brand = trim((string) ($productMaster->model?->brand?->name ?? ''));
        $model = trim((string) ($productMaster->model?->model_name ?? ''));

        return trim(implode(' ', array_filter([$brand, $model]))) ?: 'Unknown Product';
    }

    private function buildItemLabel(?string $brand, ?string $model, ?string $description, array $spec): string
    {
        $base = trim(implode(' ', array_filter([trim((string) $brand), trim((string) $model)])));
        $specLabel = implode(' / ', array_filter([
            trim((string) ($spec['ram'] ?? '')),
            trim((string) ($spec['rom'] ?? '')),
            trim((string) ($spec['condition'] ?? '')),
        ]));
        $detail = $specLabel !== '' ? $specLabel : trim((string) $description);

        return trim(implode(' - ', array_filter([$base !== '' ? $base : 'Unknown Product', $detail])));
    }

    private function buildSpecSummary(array $spec): string
    {
        $summary = implode(' / ', array_filter([
            trim((string) ($spec['ram'] ?? '')),
            trim((string) ($spec['rom'] ?? '')),
            trim((string) ($spec['condition'] ?? '')),
        ]));

        return $summary !== '' ? $summary : 'No spec';
    }

    private function grnQuantity($grnItem): float
    {
        $identifiers = $grnItem->identifiers;
        if ($identifiers && (
            filled($identifiers->serial_number) ||
            filled($identifiers->imei1) ||
            filled($identifiers->imei2)
        )) {
            return 1;
        }

        return ($grnItem->productVariant || $grnItem->details) ? 1 : 0;
    }

    private function formatMoney(float $value): string
    {
        return 'PHP '.number_format($value, 2, '.', ',');
    }

    private function formatQuantity(float $value): string
    {
        return fmod($value, 1.0) === 0.0 ? number_format($value, 0, '.', ',') : number_format($value, 2, '.', ',');
    }

    private function areAmountsEqual(float $left, float $right): bool
    {
        return abs($left - $right) < 0.0001;
    }

    private function calculatePurchaseOrderLineAmount(float $quantity, float $unitPrice, float $discount): float
    {
        $gross = $quantity * $unitPrice;
        $discountPercent = min(100, max(0, $discount));

        return max(0, $gross * (1 - ($discountPercent / 100)));
    }

    private function supplierName(PurchaseOrder $po): string
    {
        return (string) ($po->supplier?->legal_business_name ?: $po->supplier?->trade_name ?: 'Unknown Supplier');
    }

    private function transformInvoiceRecord(DeliveryReceipt $invoiceRecord): array
    {
        return [
            'id' => $invoiceRecord->id,
            'dr_number' => $invoiceRecord->dr_number,
            'invoice_number' => $invoiceRecord->reference_number,
            'declared_items_json' => [
                'dr_value' => (float) ($invoiceRecord->dr_value ?? 0),
            ],
            'date_received' => optional($invoiceRecord->date_received)?->toIso8601String(),
            'date_encoded' => optional($invoiceRecord->date_encoded)?->toIso8601String(),
            'created_date' => optional($invoiceRecord->created_at)?->toIso8601String(),
            'updated_date' => optional($invoiceRecord->updated_at)?->toIso8601String(),
        ];
    }

    private function transformGoodsReceipt(GoodsReceipt $goodsReceipt): array
    {
        return [
            'id' => $goodsReceipt->id,
            'grn_number' => $goodsReceipt->grn_number,
            'receipt_info' => [
                'grn_number' => $goodsReceipt->grn_number,
                'dr_id' => $goodsReceipt->delivery_receipt_id,
            ],
            'created_date' => optional($goodsReceipt->created_at)?->toIso8601String(),
            'created_at' => optional($goodsReceipt->created_at)?->toIso8601String(),
        ];
    }
}
