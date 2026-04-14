<?php

namespace App\Features\Pos\Queries;

use App\Features\Pos\Support\PosDataTransformer;
use App\Models\SalesTransaction;

class ListPosTransactions
{
    public function __construct(private readonly PosDataTransformer $transformer)
    {
    }

    public function handle(int $sessionId): array
    {
        return SalesTransaction::query()
            ->with([
                'customer.contacts',
                'customer.addresses',
                'salesRepresentative.jobTitle.department',
                'posSession.warehouse',
                'items.inventoryItem.productVariant.productMaster.model.brand',
                'items.inventoryItem.productVariant.productMaster.subcategory.parent',
                'items.components.inventoryItem.productVariant.productMaster.model.brand',
                'payments.paymentMethod',
                'payments.detail.documents',
                'documents',
            ])
            ->where('pos_session_id', $sessionId)
            ->latest('id')
            ->get()
            ->map(fn (SalesTransaction $transaction) => $this->transformer->transformTransaction($transaction))
            ->values()
            ->all();
    }
}
