<?php

namespace Tests\Unit\Users;

use App\Features\Users\Actions\ImportUsersFromCsv;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ImportUsersFromCsvTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_action_normalizes_headers_creates_users_and_returns_summary(): void
    {
        $actor = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);
        $actor->assignRole('Company Admin');

        User::factory()->create([
            'name' => 'Existing User',
            'username' => 'existing.user',
            'status' => User::STATUS_ACTIVE,
        ]);

        $csv = implode("\n", [
            'User Name,Full Name',
            'import.user,Import User',
            'import.user,Duplicate In CSV',
            'existing.user,Existing In DB',
        ]);

        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $summary = app(ImportUsersFromCsv::class)->handle($file, $actor);

        $this->assertSame(
            'Import complete: 1 user(s) created; 2 existing or duplicate username row(s) skipped. Initial password is username.',
            $summary,
        );

        $created = User::query()->where('username', 'import.user')->firstOrFail();
        $this->assertSame('Import User', $created->name);
        $this->assertSame(User::STATUS_ACTIVE, $created->status);
        $this->assertTrue($created->hasRole('Default'));
        $this->assertTrue(Hash::check('import.user', $created->password));
    }
}

