<?php

namespace App\Features\Pos\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class StorePosUpload
{
    public function handle(UploadedFile $file): array
    {
        $path = $file->store('pos-documents', 'public');

        return [
            'path' => $path,
            'file_url' => Storage::disk('public')->url($path),
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
        ];
    }
}
