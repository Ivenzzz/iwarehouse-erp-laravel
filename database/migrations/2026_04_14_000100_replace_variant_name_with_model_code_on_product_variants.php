<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            $this->rebuildForSqliteUp();

            return;
        }

        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('model_code', 100)->nullable()->after('product_master_id');
            $table->dropColumn('variant_name');
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            $this->rebuildForSqliteDown();

            return;
        }

        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('variant_name', 255)->nullable()->after('product_master_id');
            $table->dropColumn('model_code');
        });
    }

    private function rebuildForSqliteUp(): void
    {
        DB::statement('PRAGMA foreign_keys=OFF');

        DB::statement('CREATE TABLE product_variants_tmp (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            product_master_id INTEGER NOT NULL,
            model_code VARCHAR(100) NULL,
            sku VARCHAR(190) NOT NULL,
            condition VARCHAR(50) NOT NULL,
            color VARCHAR(100) NULL,
            ram VARCHAR(100) NULL,
            rom VARCHAR(100) NULL,
            cpu VARCHAR(150) NULL,
            gpu VARCHAR(150) NULL,
            ram_type VARCHAR(100) NULL,
            rom_type VARCHAR(100) NULL,
            operating_system VARCHAR(150) NULL,
            screen VARCHAR(150) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            CONSTRAINT idx_product_variants_master FOREIGN KEY(product_master_id) REFERENCES product_masters(id) ON DELETE CASCADE ON UPDATE CASCADE
        )');

        DB::statement('INSERT INTO product_variants_tmp (id, product_master_id, model_code, sku, condition, color, ram, rom, cpu, gpu, ram_type, rom_type, operating_system, screen, is_active, created_at, updated_at)
            SELECT id, product_master_id, NULL, sku, condition, color, ram, rom, cpu, gpu, ram_type, rom_type, operating_system, screen, is_active, created_at, updated_at
            FROM product_variants');

        DB::statement('DROP TABLE product_variants');
        DB::statement('ALTER TABLE product_variants_tmp RENAME TO product_variants');
        DB::statement('CREATE UNIQUE INDEX uq_product_variants_sku ON product_variants (sku)');
        DB::statement('CREATE INDEX idx_product_variants_condition ON product_variants (condition)');
        DB::statement('CREATE INDEX idx_product_variants_ram ON product_variants (ram)');
        DB::statement('CREATE INDEX idx_product_variants_rom ON product_variants (rom)');
        DB::statement('CREATE INDEX idx_product_variants_color ON product_variants (color)');

        DB::statement('PRAGMA foreign_keys=ON');
    }

    private function rebuildForSqliteDown(): void
    {
        DB::statement('PRAGMA foreign_keys=OFF');

        DB::statement('CREATE TABLE product_variants_tmp (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            product_master_id INTEGER NOT NULL,
            variant_name VARCHAR(255) NULL,
            sku VARCHAR(190) NOT NULL,
            condition VARCHAR(50) NOT NULL,
            color VARCHAR(100) NULL,
            ram VARCHAR(100) NULL,
            rom VARCHAR(100) NULL,
            cpu VARCHAR(150) NULL,
            gpu VARCHAR(150) NULL,
            ram_type VARCHAR(100) NULL,
            rom_type VARCHAR(100) NULL,
            operating_system VARCHAR(150) NULL,
            screen VARCHAR(150) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NULL,
            updated_at DATETIME NULL,
            CONSTRAINT idx_product_variants_master FOREIGN KEY(product_master_id) REFERENCES product_masters(id) ON DELETE CASCADE ON UPDATE CASCADE
        )');

        DB::statement('INSERT INTO product_variants_tmp (id, product_master_id, variant_name, sku, condition, color, ram, rom, cpu, gpu, ram_type, rom_type, operating_system, screen, is_active, created_at, updated_at)
            SELECT id, product_master_id, NULL, sku, condition, color, ram, rom, cpu, gpu, ram_type, rom_type, operating_system, screen, is_active, created_at, updated_at
            FROM product_variants');

        DB::statement('DROP TABLE product_variants');
        DB::statement('ALTER TABLE product_variants_tmp RENAME TO product_variants');
        DB::statement('CREATE UNIQUE INDEX uq_product_variants_sku ON product_variants (sku)');
        DB::statement('CREATE INDEX idx_product_variants_condition ON product_variants (condition)');
        DB::statement('CREATE INDEX idx_product_variants_ram ON product_variants (ram)');
        DB::statement('CREATE INDEX idx_product_variants_rom ON product_variants (rom)');
        DB::statement('CREATE INDEX idx_product_variants_color ON product_variants (color)');

        DB::statement('PRAGMA foreign_keys=ON');
    }
};
