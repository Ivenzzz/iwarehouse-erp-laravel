<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_master_id')
                ->constrained('product_masters', indexName: 'idx_product_variants_master')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('variant_name', 255);
            $table->string('sku', 190);
            $table->string('condition', 50);
            $table->string('color', 100)->nullable();
            $table->string('ram', 100)->nullable();
            $table->string('rom', 100)->nullable();
            $table->string('cpu', 150)->nullable();
            $table->string('gpu', 150)->nullable();
            $table->string('ram_type', 100)->nullable();
            $table->string('rom_type', 100)->nullable();
            $table->string('operating_system', 150)->nullable();
            $table->string('screen', 150)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('sku', 'uq_product_variants_sku');
            $table->index('condition', 'idx_product_variants_condition');
            $table->index('ram', 'idx_product_variants_ram');
            $table->index('rom', 'idx_product_variants_rom');
            $table->index('color', 'idx_product_variants_color');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
