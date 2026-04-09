<?php

namespace App\Features\StockTransfers\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class StoreStockTransferUpload
{
    /**
     * @return array{file_path: string, file_url: string}
     */
    public function handle(UploadedFile $file, string $directory = 'stock-transfers'): array
    {
        if (! str_starts_with((string) $file->getMimeType(), 'image/')) {
            throw new InvalidArgumentException('Only image uploads are supported.');
        }

        $path = $file->store($directory, 'public');

        return [
            'file_path' => $path,
            'file_url' => Storage::disk('public')->url($path),
        ];
    }
}
