<?php

namespace Tests\Feature;

use App\Models\CompanyInfo;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CompaniesSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_companies_page_requires_companies_view_permission(): void
    {
        $stockman = $this->userWithRole('Stockman');
        $companyAdmin = $this->userWithRole('Company Admin');

        $this->actingAs($stockman)
            ->get(route('settings.companies.index'))
            ->assertForbidden();

        $this->actingAs($companyAdmin)
            ->get(route('settings.companies.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Companies')
                ->where('company', null)
            );
    }

    public function test_companies_update_requires_companies_update_permission(): void
    {
        $stockman = $this->userWithRole('Stockman');

        $this->actingAs($stockman)
            ->put(route('settings.companies.update'), [
                'company_name' => 'No Access Inc.',
            ])
            ->assertForbidden();
    }

    public function test_update_creates_company_when_none_exists(): void
    {
        $admin = $this->userWithRole('Company Admin');

        $this->actingAs($admin)
            ->put(route('settings.companies.update'), [
                'company_name' => 'iWarehouse Corp',
                'legal_name' => 'iWarehouse Corporation',
                'tax_id' => 'TIN-123',
                'address' => 'Quezon City',
                'phone' => '+63 900 000 0000',
                'email' => 'admin@iwarehouse.test',
                'website' => 'https://iwarehouse.test',
            ])
            ->assertRedirect(route('settings.companies.index', absolute: false));

        $this->assertDatabaseHas('company_infos', [
            'company_name' => 'iWarehouse Corp',
            'legal_name' => 'iWarehouse Corporation',
            'tax_id' => 'TIN-123',
            'address' => 'Quezon City',
            'phone' => '+63 900 000 0000',
            'email' => 'admin@iwarehouse.test',
            'website' => 'https://iwarehouse.test',
        ]);
    }

    public function test_update_uses_latest_company_row_when_multiple_records_exist(): void
    {
        $admin = $this->userWithRole('Company Admin');
        $older = CompanyInfo::create(['company_name' => 'Older Company']);
        $latest = CompanyInfo::create(['company_name' => 'Latest Company']);

        $this->actingAs($admin)
            ->put(route('settings.companies.update'), [
                'company_name' => 'Updated Latest Company',
            ])
            ->assertRedirect(route('settings.companies.index', absolute: false));

        $older->refresh();
        $latest->refresh();

        $this->assertSame('Older Company', $older->company_name);
        $this->assertSame('Updated Latest Company', $latest->company_name);
    }

    public function test_update_validates_required_and_format_fields(): void
    {
        $admin = $this->userWithRole('Company Admin');

        $this->actingAs($admin)
            ->put(route('settings.companies.update'), [
                'company_name' => '',
                'email' => 'invalid-email',
                'website' => 'invalid-url',
            ])
            ->assertSessionHasErrors(['company_name', 'email', 'website']);
    }

    public function test_logo_upload_sets_logo_path(): void
    {
        Storage::fake('public');
        $admin = $this->userWithRole('Company Admin');
        $logo = UploadedFile::fake()->image('logo.png');

        $this->actingAs($admin)
            ->put(route('settings.companies.update'), [
                'company_name' => 'Logo Company',
                'logo' => $logo,
            ])
            ->assertRedirect(route('settings.companies.index', absolute: false));

        $company = CompanyInfo::query()->latest('id')->firstOrFail();

        $this->assertNotNull($company->logo_path);
        Storage::disk('public')->assertExists($company->logo_path);
    }

    public function test_logo_replace_deletes_previous_file_and_stores_new_file(): void
    {
        Storage::fake('public');
        $admin = $this->userWithRole('Company Admin');
        $oldPath = 'company-logos/old-logo.png';
        Storage::disk('public')->put($oldPath, 'old-image');

        $company = CompanyInfo::create([
            'company_name' => 'Replace Logo Company',
            'logo_path' => $oldPath,
        ]);

        $this->actingAs($admin)
            ->put(route('settings.companies.update'), [
                'company_name' => 'Replace Logo Company',
                'logo' => UploadedFile::fake()->image('new-logo.png'),
            ])
            ->assertRedirect(route('settings.companies.index', absolute: false));

        $company->refresh();

        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($company->logo_path);
    }

    public function test_remove_logo_clears_logo_path_and_deletes_file(): void
    {
        Storage::fake('public');
        $admin = $this->userWithRole('Company Admin');
        $logoPath = 'company-logos/remove-logo.png';
        Storage::disk('public')->put($logoPath, 'remove-image');

        $company = CompanyInfo::create([
            'company_name' => 'Remove Logo Company',
            'logo_path' => $logoPath,
        ]);

        $this->actingAs($admin)
            ->put(route('settings.companies.update'), [
                'company_name' => 'Remove Logo Company',
                'remove_logo' => true,
            ])
            ->assertRedirect(route('settings.companies.index', absolute: false));

        $company->refresh();

        $this->assertNull($company->logo_path);
        Storage::disk('public')->assertMissing($logoPath);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
        ]);

        $user->assignRole($role);

        return $user;
    }
}

