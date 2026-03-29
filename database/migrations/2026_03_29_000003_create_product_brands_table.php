<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->timestamps();

            $table->unique('name', 'uq_brands_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_brands');
    }
};
