<?php

namespace App\Features\ProductMasters\Actions;

use App\Models\ProductMaster;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DeleteProductMaster
{
    public function handle(ProductMaster $productMaster): void
    {
        DB::transaction(function () use ($productMaster) {
            $imagePath = $productMaster->image_path;

            $productMaster->delete();

            if ($imagePath !== null) {
                Storage::disk('public')->delete($imagePath);
            }
        });
    }
}
