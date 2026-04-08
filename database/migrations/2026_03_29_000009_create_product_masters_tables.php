<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_masters', function (Blueprint $table) {
            $table->id();
            $table->string('master_sku', 150);
            $table->foreignId('model_id')
                ->constrained('product_models', indexName: 'idx_product_masters_model')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('subcategory_id')
                ->constrained('product_categories', indexName: 'idx_product_masters_subcategory')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('image_path')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique('master_sku', 'uq_product_masters_sku');
            $table->unique('model_id', 'uq_product_masters_model');
        });

        Schema::create('product_spec_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100);
            $table->string('label', 150);
            $table->string('group', 50);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique('key', 'uq_product_spec_definitions_key');
        });

        Schema::create('product_master_spec_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_master_id')
                ->constrained('product_masters', indexName: 'idx_product_master_spec_values_master')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('product_spec_definition_id')
                ->constrained('product_spec_definitions', indexName: 'idx_product_master_spec_values_definition')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['product_master_id', 'product_spec_definition_id'], 'uq_product_master_spec_values_master_definition');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_master_spec_values');
        Schema::dropIfExists('product_spec_definitions');
        Schema::dropIfExists('product_masters');
    }
};
