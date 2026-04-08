<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductModel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BrandsTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_brands_page(): void
    {
        $this->get('/brands')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_brands_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/brands')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Brands')
                ->has('brands.data')
                ->where('filters.search', '')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'asc')
                ->where('flash.success', null)
                ->where('flash.error', null)
            );
    }

    public function test_brands_page_shares_flash_success_and_error_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession([
                'success' => 'Saved successfully',
                'error' => 'Import failed',
            ])
            ->get('/brands')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('flash.success', 'Saved successfully')
                ->where('flash.error', 'Import failed')
            );
    }

    public function test_brands_index_is_paginated_to_ten_records(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 12) as $index) {
            ProductBrand::create(['name' => sprintf('Brand %02d', $index)]);
        }

        $this->actingAs($user)
            ->get(route('brands.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('brands.data', 10)
                ->where('brands.total', 12)
                ->where('brands.per_page', 10)
                ->where('brands.current_page', 1)
            );
    }

    public function test_brands_index_searches_brand_and_model_names(): void
    {
        $user = User::factory()->create();
        ProductBrand::create(['name' => 'Canon']);
        $sony = ProductBrand::create(['name' => 'Sony']);
        $sony->models()->create(['model_name' => 'PlayStation 5']);

        $this->actingAs($user)
            ->get(route('brands.index', ['search' => 'playstation']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('brands.data', 1)
                ->where('brands.data.0.name', 'Sony')
                ->where('filters.search', 'playstation')
            );

        $this->actingAs($user)
            ->get(route('brands.index', ['search' => 'canon']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('brands.data', 1)
                ->where('brands.data.0.name', 'Canon')
                ->where('filters.search', 'canon')
            );
    }

    public function test_brands_index_sorts_by_name_and_model_count(): void
    {
        $user = User::factory()->create();
        $acer = ProductBrand::create(['name' => 'Acer']);
        $sony = ProductBrand::create(['name' => 'Sony']);
        $sony->models()->createMany([
            ['model_name' => 'PlayStation 5'],
            ['model_name' => 'Bravia XR'],
        ]);
        $acer->models()->create(['model_name' => 'Aspire']);

        $this->actingAs($user)
            ->get(route('brands.index', ['sort' => 'name', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('brands.data.0.name', 'Sony')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'desc')
            );

        $this->actingAs($user)
            ->get(route('brands.index', ['sort' => 'models_count', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('brands.data.0.name', 'Sony')
                ->where('brands.data.0.models_count', 2)
                ->where('filters.sort', 'models_count')
                ->where('filters.direction', 'desc')
            );
    }

    public function test_user_can_create_brand_with_models(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/brands', [
            'name' => 'Sony',
            'models' => [
                ['model_name' => 'Alpha 7'],
                ['model_name' => 'Bravia X90'],
            ],
        ])->assertRedirect(route('brands.index', absolute: false));

        $brand = ProductBrand::where('name', 'Sony')->firstOrFail();

        $this->assertDatabaseHas('product_models', [
            'brand_id' => $brand->id,
            'model_name' => 'Alpha 7',
        ]);
        $this->assertDatabaseHas('product_models', [
            'brand_id' => $brand->id,
            'model_name' => 'Bravia X90',
        ]);
    }

    public function test_user_can_update_brand_and_models(): void
    {
        $user = User::factory()->create();
        $brand = ProductBrand::create(['name' => 'Samsung']);
        $existing = $brand->models()->create(['model_name' => 'Galaxy S24']);

        $this->actingAs($user)->put(route('brands.update', $brand), [
            'name' => 'Samsung Electronics',
            'models' => [
                ['id' => $existing->id, 'model_name' => 'Galaxy S24 Ultra'],
                ['model_name' => 'Neo QLED QN90'],
            ],
        ])->assertRedirect(route('brands.index', absolute: false));

        $this->assertDatabaseHas('product_brands', [
            'id' => $brand->id,
            'name' => 'Samsung Electronics',
        ]);
        $this->assertDatabaseHas('product_models', [
            'id' => $existing->id,
            'model_name' => 'Galaxy S24 Ultra',
        ]);
        $this->assertDatabaseHas('product_models', [
            'brand_id' => $brand->id,
            'model_name' => 'Neo QLED QN90',
        ]);
    }

    public function test_deleting_brand_cascades_to_models(): void
    {
        $user = User::factory()->create();
        $brand = ProductBrand::create(['name' => 'Apple']);
        $model = $brand->models()->create(['model_name' => 'MacBook Pro']);

        $this->actingAs($user)
            ->delete(route('brands.destroy', $brand))
            ->assertRedirect(route('brands.index', absolute: false));

        $this->assertDatabaseMissing('product_brands', ['id' => $brand->id]);
        $this->assertDatabaseMissing('product_models', ['id' => $model->id]);
    }

    public function test_duplicate_brand_name_is_rejected(): void
    {
        $user = User::factory()->create();
        ProductBrand::create(['name' => 'Canon']);

        $this->actingAs($user)
            ->post('/brands', [
                'name' => 'Canon',
                'models' => [],
            ])
            ->assertSessionHasErrors('name');
    }

    public function test_duplicate_model_name_within_brand_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/brands', [
                'name' => 'Nikon',
                'models' => [
                    ['model_name' => 'Z6 II'],
                    ['model_name' => 'Z6 II'],
                ],
            ])
            ->assertSessionHasErrors('models');
    }

    public function test_import_creates_brands_and_models_from_csv(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
brand_name,model_name
Sony,PlayStation 5
Sony,Bravia XR
LG,
CSV;

        $file = UploadedFile::fake()->createWithContent('brands.csv', $csv);

        $this->actingAs($user)
            ->post(route('brands.import'), ['file' => $file])
            ->assertRedirect(route('brands.index', absolute: false))
            ->assertSessionHas('success');

        $sony = ProductBrand::where('name', 'Sony')->firstOrFail();
        $lg = ProductBrand::where('name', 'LG')->firstOrFail();

        $this->assertDatabaseHas('product_models', [
            'brand_id' => $sony->id,
            'model_name' => 'PlayStation 5',
        ]);
        $this->assertDatabaseHas('product_models', [
            'brand_id' => $sony->id,
            'model_name' => 'Bravia XR',
        ]);
        $this->assertSame(0, $lg->models()->count());
    }

    public function test_import_skips_existing_brands_models_and_duplicate_csv_rows(): void
    {
        $user = User::factory()->create();
        $brand = ProductBrand::create(['name' => 'Sony']);
        $brand->models()->create(['model_name' => 'PlayStation 5']);
        $csv = <<<CSV
brand_name,model_name
sony,playstation 5
Sony,PlayStation 5
Sony,Bravia XR
CSV;

        $file = UploadedFile::fake()->createWithContent('brands.csv', $csv);

        $this->actingAs($user)
            ->post(route('brands.import'), ['file' => $file])
            ->assertRedirect(route('brands.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertSame(1, ProductBrand::where('name', 'Sony')->count());
        $this->assertSame(1, $brand->models()->where('model_name', 'PlayStation 5')->count());
        $this->assertDatabaseHas('product_models', [
            'brand_id' => $brand->id,
            'model_name' => 'Bravia XR',
        ]);
    }

    public function test_import_rejects_invalid_rows_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
brand_name,model_name
Sony,PlayStation 5
,Orphan Model
CSV;

        $file = UploadedFile::fake()->createWithContent('brands.csv', $csv);

        $this->actingAs($user)
            ->post(route('brands.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('product_brands', ['name' => 'Sony']);
        $this->assertDatabaseMissing('product_models', ['model_name' => 'PlayStation 5']);
        $this->assertDatabaseMissing('product_models', ['model_name' => 'Orphan Model']);
    }

    public function test_import_requires_expected_csv_headers(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
brand,model
Sony,PlayStation 5
CSV;

        $file = UploadedFile::fake()->createWithContent('brands.csv', $csv);

        $this->actingAs($user)
            ->post(route('brands.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('product_brands', ['name' => 'Sony']);
        $this->assertDatabaseMissing('product_models', ['model_name' => 'PlayStation 5']);
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();
        $brandA = ProductBrand::create(['name' => 'Dell']);
        $brandA->models()->create(['model_name' => 'Latitude 7440']);
        ProductBrand::create(['name' => 'Acer']);

        $response = $this->actingAs($user)->get(route('brands.export'));

        $response->assertOk();
        $response->assertDownload('brands-models.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString("brand_name,model_name", $content);
        $this->assertStringContainsString("Dell,\"Latitude 7440\"", $content);
        $this->assertStringContainsString("Acer,", $content);
    }
}
