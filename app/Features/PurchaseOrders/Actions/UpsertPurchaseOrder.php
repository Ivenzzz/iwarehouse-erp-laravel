<?php

namespace App\Features\PurchaseOrders\Actions;

use App\Models\PurchaseOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpsertPurchaseOrder
{
    /**
     * @param  array<int, array{product_master_id:int,quantity:int,unit_price:numeric-string|int|float,discount?:numeric-string|int|float|null,description?:string|null,product_spec?:array{model_code?:string|null,ram?:string|null,rom?:string|null,condition?:string|null}}>  $items
     */
    public function handle(array $payload, ?int $purchaseOrderId, ?int $actorId): PurchaseOrder
    {
        return DB::transaction(function () use ($payload, $purchaseOrderId, $actorId): PurchaseOrder {
            $supplierId = (int) $payload['supplier_id'];
            $expectedDeliveryDate = $payload['expected_delivery_date'] ?? null;
            $shippingAmount = (float) ($payload['shipping_amount'] ?? 0);
            $paymentTermId = $this->ensurePaymentTermId((string) ($payload['payment_terms'] ?? 'Net 30'));
            $shippingMethodId = $this->ensureShippingMethodId((string) ($payload['shipping_method'] ?? 'Standard Delivery'));

            if ($purchaseOrderId === null) {
                $poId = (int) DB::table('purchase_orders')->insertGetId([
                    'po_number' => $this->nextPoNumber(),
                    'rfq_id' => null,
                    'supplier_id' => $supplierId,
                    'selected_supplier_quote_id' => null,
                    'shipping_method_id' => $shippingMethodId,
                    'payment_term_id' => $paymentTermId,
                    'expected_delivery_date' => $expectedDeliveryDate,
                    'shipping_amount' => $shippingAmount,
                    'status' => 'pending',
                    'has_delivery_receipt' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('purchase_order_payables')->insert([
                    'purchase_order_id' => $poId,
                    'has_paid' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $poId = $purchaseOrderId;
                $existingPo = DB::table('purchase_orders')->where('id', $poId)->first();
                if (! $existingPo) {
                    throw ValidationException::withMessages(['id' => 'Purchase Order not found.']);
                }

                if ($existingPo->rfq_id !== null) {
                    throw ValidationException::withMessages([
                        'id' => 'RFQ-derived purchase orders cannot be edited manually.',
                    ]);
                }

                DB::table('purchase_order_item_specs')
                    ->whereIn('purchase_order_item_id', DB::table('purchase_order_items')->where('purchase_order_id', $poId)->select('id'))
                    ->delete();
                DB::table('purchase_order_items')->where('purchase_order_id', $poId)->delete();

                DB::table('purchase_orders')->where('id', $poId)->update([
                    'supplier_id' => $supplierId,
                    'shipping_method_id' => $shippingMethodId,
                    'payment_term_id' => $paymentTermId,
                    'expected_delivery_date' => $expectedDeliveryDate,
                    'shipping_amount' => $shippingAmount,
                    'updated_at' => now(),
                ]);
            }

            /** @var array<int, array<string, bool>> $variantSpecCache */
            $variantSpecCache = [];
            foreach ($payload['items'] as $item) {
                $productMasterId = (int) $item['product_master_id'];
                if ($productMasterId <= 0) {
                    throw ValidationException::withMessages(['items' => 'Each line item must include a product.']);
                }
                $submittedSpec = [
                    'model_code' => $this->cleanSpecValue($item['product_spec']['model_code'] ?? null),
                    'condition' => $this->cleanSpecValue($item['product_spec']['condition'] ?? null),
                    'ram' => $this->cleanSpecValue($item['product_spec']['ram'] ?? null),
                    'rom' => $this->cleanSpecValue($item['product_spec']['rom'] ?? null),
                ];
                $specKey = $this->buildSpecKey($submittedSpec);

                if (! array_key_exists($productMasterId, $variantSpecCache)) {
                    $variantSpecCache[$productMasterId] = $this->loadVariantSpecKeys($productMasterId);
                }

                if (! isset($variantSpecCache[$productMasterId][$specKey])) {
                    throw ValidationException::withMessages([
                        'items' => 'One or more selected product specs are no longer available for the chosen product.',
                    ]);
                }

                $poItemId = (int) DB::table('purchase_order_items')->insertGetId([
                    'purchase_order_id' => $poId,
                    'product_master_id' => $productMasterId,
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $item['unit_price'],
                    'discount' => (float) ($item['discount'] ?? 0),
                    'description' => $item['description'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('purchase_order_item_specs')->insert([
                    'purchase_order_item_id' => $poItemId,
                    'model_code' => $submittedSpec['model_code'],
                    'ram' => $submittedSpec['ram'],
                    'rom' => $submittedSpec['rom'],
                    'condition' => $submittedSpec['condition'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            if ($purchaseOrderId === null) {
                DB::table('purchase_order_status_histories')->insert([
                    'purchase_order_id' => $poId,
                    'status' => 'pending',
                    'changed_by_id' => $actorId,
                    'occurred_at' => now(),
                    'notes' => 'Purchase Order created manually',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return PurchaseOrder::query()->findOrFail($poId);
        });
    }

    private function ensurePaymentTermId(string $name): int
    {
        $normalized = trim($name) !== '' ? trim($name) : 'Net 30';
        $existing = (int) DB::table('payment_terms')->whereRaw('LOWER(name) = ?', [strtolower($normalized)])->value('id');
        if ($existing > 0) {
            return $existing;
        }

        return (int) DB::table('payment_terms')->insertGetId([
            'name' => $normalized,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function ensureShippingMethodId(string $name): int
    {
        $normalized = trim($name) !== '' ? trim($name) : 'Standard Delivery';
        $existing = (int) DB::table('shipping_methods')->whereRaw('LOWER(name) = ?', [strtolower($normalized)])->value('id');
        if ($existing > 0) {
            return $existing;
        }

        return (int) DB::table('shipping_methods')->insertGetId([
            'name' => $normalized,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function nextPoNumber(): string
    {
        $prefix = 'PO-'.now()->format('Ymd').'-';
        $latest = DB::table('purchase_orders')
            ->where('po_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('po_number');
        $next = 1;
        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @return array<string, bool>
     */
    private function loadVariantSpecKeys(int $productMasterId): array
    {
        $variants = DB::table('product_variants')
            ->where('product_master_id', $productMasterId)
            ->where('is_active', true)
            ->get(['model_code', 'condition', 'ram', 'rom']);

        $keys = [];
        foreach ($variants as $variant) {
            $key = $this->buildSpecKey([
                'model_code' => $this->cleanSpecValue($variant->model_code),
                'condition' => $this->cleanSpecValue($variant->condition),
                'ram' => $this->cleanSpecValue($variant->ram),
                'rom' => $this->cleanSpecValue($variant->rom),
            ]);
            $keys[$key] = true;
        }

        return $keys;
    }

    /**
     * @param  array{model_code:string,condition:string,ram:string,rom:string}  $spec
     */
    private function buildSpecKey(array $spec): string
    {
        return implode('|', [
            $this->normalizeSpecValue($spec['model_code']),
            $this->normalizeSpecValue($spec['condition']),
            $this->normalizeSpecValue($spec['ram']),
            $this->normalizeSpecValue($spec['rom']),
        ]);
    }

    private function normalizeSpecValue(?string $value): string
    {
        return strtolower(trim((string) ($value ?? '')));
    }

    private function cleanSpecValue(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }
}
