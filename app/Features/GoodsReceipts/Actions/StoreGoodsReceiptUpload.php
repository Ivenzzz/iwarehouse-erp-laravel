<?php

namespace App\Features\GoodsReceipts\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class StoreGoodsReceiptUpload
{
    public function handle(UploadedFile $file): array
    {
        $path = $file->store('goods-receipts/uploads', 'public');

        return [
            'path' => $path,
            'file_url' => Storage::disk('public')->url($path),
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
        ];
    }
}

