<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StockTransfersSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_transfer_and_company_info_tables_are_created(): void
    {
        $this->assertTrue(Schema::hasTable('company_infos'));
        $this->assertTrue(Schema::hasTable('stock_transfers'));
        $this->assertFalse(Schema::hasTable('stock_transfer_lines'));
        $this->assertFalse(Schema::hasTable('stock_transfer_line_items'));
        $this->assertTrue(Schema::hasTable('stock_transfer_items'));
        $this->assertTrue(Schema::hasTable('stock_transfer_milestones'));
        $this->assertTrue(Schema::hasTable('stock_transfer_shipments'));
        $this->assertFalse(Schema::hasTable('stock_transfer_validation_batches'));
        $this->assertFalse(Schema::hasTable('stock_transfer_validation_photos'));
        $this->assertTrue(Schema::hasTable('stock_transfer_receipts'));
        $this->assertTrue(Schema::hasTable('stock_transfer_receipt_items'));
        $this->assertTrue(Schema::hasTable('stock_transfer_receipt_photos'));
        $this->assertTrue(Schema::hasTable('stock_transfer_consolidations'));
        $this->assertTrue(Schema::hasTable('stock_transfer_consolidation_sources'));
    }
}
