<?php

namespace Tests\Feature;

use App\Models\ProductBrand;
use App\Models\ProductModel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
            ->assertOk();
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
            ->assertRedirect(route('brands.index', absolute: false));

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
