<?php

namespace Tests\Feature;

use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CategoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_categories_page(): void
    {
        $this->get('/categories')->assertRedirect(route('login', absolute: false));
    }

    public function test_authenticated_users_can_open_categories_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('categories.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Categories')
                ->has('categories.data')
                ->has('topLevelCategories')
                ->where('filters.search', '')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'asc')
            );
    }

    public function test_categories_index_is_paginated_to_ten_records(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 12) as $index) {
            ProductCategory::create(['name' => sprintf('Category %02d', $index)]);
        }

        $this->actingAs($user)
            ->get(route('categories.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('categories.data', 10)
                ->where('categories.total', 12)
                ->where('categories.per_page', 10)
                ->where('categories.current_page', 1)
            );
    }

    public function test_categories_index_searches_category_and_parent_names(): void
    {
        $user = User::factory()->create();
        ProductCategory::create(['name' => 'Accessories']);
        $parent = ProductCategory::create(['name' => 'Computers']);
        ProductCategory::create(['name' => 'Gaming Laptops', 'parent_category_id' => $parent->id]);

        $this->actingAs($user)
            ->get(route('categories.index', ['search' => 'gaming']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('categories.data', 1)
                ->where('categories.data.0.name', 'Gaming Laptops')
                ->where('filters.search', 'gaming')
            );

        $this->actingAs($user)
            ->get(route('categories.index', ['search' => 'computers']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('categories.data', 2)
                ->where('filters.search', 'computers')
            );
    }

    public function test_categories_index_sorts_by_name_and_parent(): void
    {
        $user = User::factory()->create();
        $computers = ProductCategory::create(['name' => 'Computers']);
        $phones = ProductCategory::create(['name' => 'Phones']);
        ProductCategory::create(['name' => 'Laptops', 'parent_category_id' => $computers->id]);
        ProductCategory::create(['name' => 'Cases', 'parent_category_id' => $phones->id]);

        $this->actingAs($user)
            ->get(route('categories.index', ['sort' => 'name', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('categories.data.0.name', 'Phones')
                ->where('filters.sort', 'name')
                ->where('filters.direction', 'desc')
            );

        $this->actingAs($user)
            ->get(route('categories.index', ['sort' => 'parent', 'direction' => 'desc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sort', 'parent')
                ->where('filters.direction', 'desc')
            );
    }

    public function test_user_can_create_category_and_subcategory(): void
    {
        $user = User::factory()->create();
        $parent = ProductCategory::create(['name' => 'Computers']);

        $this->actingAs($user)
            ->post(route('categories.store'), [
                'name' => 'Gaming Laptops',
                'parent_category_id' => $parent->id,
            ])
            ->assertRedirect(route('categories.index', absolute: false));

        $this->assertDatabaseHas('product_categories', [
            'name' => 'Gaming Laptops',
            'parent_category_id' => $parent->id,
        ]);
    }

    public function test_user_can_update_category(): void
    {
        $user = User::factory()->create();
        $category = ProductCategory::create(['name' => 'Phones']);

        $this->actingAs($user)
            ->put(route('categories.update', $category), [
                'name' => 'Smartphones',
                'parent_category_id' => null,
            ])
            ->assertRedirect(route('categories.index', absolute: false));

        $this->assertDatabaseHas('product_categories', [
            'id' => $category->id,
            'name' => 'Smartphones',
            'parent_category_id' => null,
        ]);
    }

    public function test_deleting_category_sets_children_to_top_level(): void
    {
        $user = User::factory()->create();
        $parent = ProductCategory::create(['name' => 'Computers']);
        $child = ProductCategory::create([
            'name' => 'Laptops',
            'parent_category_id' => $parent->id,
        ]);

        $this->actingAs($user)
            ->delete(route('categories.destroy', $parent))
            ->assertRedirect(route('categories.index', absolute: false));

        $this->assertDatabaseMissing('product_categories', ['id' => $parent->id]);
        $this->assertDatabaseHas('product_categories', [
            'id' => $child->id,
            'parent_category_id' => null,
        ]);
    }

    public function test_import_creates_categories_and_subcategories_from_csv(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
category,subcategory
Computers,Laptops
Computers,Desktops
Accessories,
CSV;

        $file = UploadedFile::fake()->createWithContent('categories.csv', $csv);

        $this->actingAs($user)
            ->post(route('categories.import'), ['file' => $file])
            ->assertRedirect(route('categories.index', absolute: false))
            ->assertSessionHas('success');

        $computers = ProductCategory::where('name', 'Computers')->firstOrFail();

        $this->assertDatabaseHas('product_categories', [
            'name' => 'Laptops',
            'parent_category_id' => $computers->id,
        ]);
        $this->assertDatabaseHas('product_categories', [
            'name' => 'Desktops',
            'parent_category_id' => $computers->id,
        ]);
        $this->assertDatabaseHas('product_categories', [
            'name' => 'Accessories',
            'parent_category_id' => null,
        ]);
    }

    public function test_import_skips_existing_categories_and_duplicate_csv_rows(): void
    {
        $user = User::factory()->create();
        $computers = ProductCategory::create(['name' => 'Computers']);
        ProductCategory::create(['name' => 'Laptops', 'parent_category_id' => $computers->id]);
        $csv = <<<CSV
category,subcategory
computers,laptops
Computers,Laptops
Computers,Desktops
CSV;

        $file = UploadedFile::fake()->createWithContent('categories.csv', $csv);

        $this->actingAs($user)
            ->post(route('categories.import'), ['file' => $file])
            ->assertRedirect(route('categories.index', absolute: false))
            ->assertSessionHas('success');

        $this->assertSame(1, ProductCategory::where('name', 'Computers')->count());
        $this->assertSame(1, $computers->children()->where('name', 'Laptops')->count());
        $this->assertDatabaseHas('product_categories', [
            'name' => 'Desktops',
            'parent_category_id' => $computers->id,
        ]);
    }

    public function test_import_rejects_invalid_rows_without_partial_inserts(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
category,subcategory
Computers,Laptops
,Orphan
CSV;

        $file = UploadedFile::fake()->createWithContent('categories.csv', $csv);

        $this->actingAs($user)
            ->post(route('categories.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('product_categories', ['name' => 'Computers']);
        $this->assertDatabaseMissing('product_categories', ['name' => 'Laptops']);
        $this->assertDatabaseMissing('product_categories', ['name' => 'Orphan']);
    }

    public function test_import_requires_expected_csv_headers(): void
    {
        $user = User::factory()->create();
        $csv = <<<CSV
name,parent
Computers,Laptops
CSV;

        $file = UploadedFile::fake()->createWithContent('categories.csv', $csv);

        $this->actingAs($user)
            ->post(route('categories.import'), ['file' => $file])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseMissing('product_categories', ['name' => 'Computers']);
    }

    public function test_export_returns_expected_csv_shape(): void
    {
        $user = User::factory()->create();
        $computers = ProductCategory::create(['name' => 'Computers']);
        ProductCategory::create(['name' => 'Laptops', 'parent_category_id' => $computers->id]);
        ProductCategory::create(['name' => 'Accessories']);

        $response = $this->actingAs($user)->get(route('categories.export'));

        $response->assertOk();
        $response->assertDownload('product-categories.csv');

        $content = $response->streamedContent();

        $this->assertStringContainsString('category,subcategory', $content);
        $this->assertStringContainsString('Computers,Laptops', $content);
        $this->assertStringContainsString('Accessories,', $content);
    }
}
