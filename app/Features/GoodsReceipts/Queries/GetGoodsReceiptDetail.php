<?php

namespace App\Features\GoodsReceipts\Queries;

use App\Features\GoodsReceipts\Support\GoodsReceiptDataTransformer;
use App\Models\GoodsReceipt;

class GetGoodsReceiptDetail
{
    public function __invoke(GoodsReceipt $goodsReceipt): array
    {
        $goodsReceipt->loadMissing(GoodsReceiptDataTransformer::$DETAIL_RELATIONS);

        return [
            'goods_receipt' => GoodsReceiptDataTransformer::transformReceiptDetail($goodsReceipt),
        ];
    }
}

