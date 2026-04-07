<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')
                ->constrained('suppliers', indexName: 'idx_supplier_contacts_supplier')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->string('email', 150)->nullable();
            $table->string('mobile', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_contacts');
    }
};
