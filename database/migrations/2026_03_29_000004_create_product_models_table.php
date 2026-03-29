<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')
                ->constrained('product_brands', indexName: 'idx_product_models_brand')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('model_name', 150);
            $table->timestamps();

            $table->unique(['brand_id', 'model_name'], 'uq_product_models_brand_model');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_models');
    }
};
