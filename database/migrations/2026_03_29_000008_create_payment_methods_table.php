<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('type', 50);
            $table->string('logo', 255)->nullable();
            $table->timestamps();

            $table->unique('name', 'uq_payment_methods_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
