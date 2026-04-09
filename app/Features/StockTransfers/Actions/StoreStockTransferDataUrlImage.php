<?php

namespace App\Features\StockTransfers\Actions;

use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class StoreStockTransferDataUrlImage
{
    public function handle(string $dataUrl, string $directory = 'stock-transfers'): string
    {
        if (! preg_match('/^data:image\/(\w+);base64,/', $dataUrl, $matches)) {
            throw new InvalidArgumentException('Invalid image payload.');
        }

        $extension = strtolower($matches[1]);
        $binary = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);

        if ($binary === false) {
            throw new InvalidArgumentException('Invalid base64 image payload.');
        }

        $filename = sprintf('%s/%s.%s', trim($directory, '/'), str()->uuid(), $extension);
        Storage::disk('public')->put($filename, $binary);

        return $filename;
    }
}
