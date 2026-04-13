<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('request_for_quotation_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_for_quotation_id')
                ->constrained('request_for_quotations', indexName: 'idx_request_for_quotation_sources_rfq')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('source_request_for_quotation_id')
                ->constrained('request_for_quotations', indexName: 'idx_request_for_quotation_sources_source_rfq')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('source_stock_request_id')
                ->constrained('stock_requests', indexName: 'idx_request_for_quotation_sources_source_sr')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(
                ['request_for_quotation_id', 'source_request_for_quotation_id'],
                'uq_request_for_quotation_sources_rfq_source_rfq'
            );
            $table->index(
                ['request_for_quotation_id', 'source_stock_request_id'],
                'idx_request_for_quotation_sources_rfq_source_sr'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_for_quotation_sources');
    }
};
