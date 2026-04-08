<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variant_attributes', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100);
            $table->string('label', 150);
            $table->string('group', 50);
            $table->string('data_type', 20)->default('text');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_computer_only')->default(false);
            $table->boolean('is_dimension')->default(false);
            $table->timestamps();

            $table->unique('key', 'uq_product_variant_attributes_key');
        });

        Schema::create('category_variant_attributes', function (Blueprint $table) {
            $table->foreignId('category_id')
                ->constrained('product_categories', indexName: 'idx_category_variant_attributes_category')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('product_variant_attribute_id')
                ->constrained('product_variant_attributes', indexName: 'idx_category_variant_attributes_attribute')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->primary(
                ['category_id', 'product_variant_attribute_id'],
                'pk_category_variant_attributes',
            );
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_master_id')
                ->constrained('product_masters', indexName: 'idx_product_variants_master')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('variant_name', 255);
            $table->string('sku', 190);
            $table->string('condition', 50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('sku', 'uq_product_variants_sku');
        });

        Schema::create('product_variant_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')
                ->constrained('product_variants', indexName: 'idx_product_variant_values_variant')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('product_variant_attribute_id')
                ->constrained('product_variant_attributes', indexName: 'idx_product_variant_values_attribute')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(
                ['product_variant_id', 'product_variant_attribute_id'],
                'uq_product_variant_values_variant_attribute',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_values');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('category_variant_attributes');
        Schema::dropIfExists('product_variant_attributes');
    }
};
