<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);
        $this->call(ProductSpecDefinitionSeeder::class);
        $this->call(ProductVariantAttributeSeeder::class);

        $admin = User::updateOrCreate([
            'username' => 'admin',
        ], [
            'name' => 'ERP Administrator',
            'email' => null,
            'password' => 'Password123!',
            'status' => User::STATUS_ACTIVE,
        ]);

        $admin->assignRole('SuperAdmin');

        $this->call(PosSeeder::class);
    }
}
