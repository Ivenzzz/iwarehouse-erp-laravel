<?php

namespace App\Features\Categories\Http\Controllers;

use App\Features\Categories\Actions\ExportCategoriesCsv;
use App\Features\Categories\Actions\ImportCategoriesFromCsv;
use App\Features\Categories\Actions\SaveCategory;
use App\Features\Categories\Http\Requests\ImportCategoriesRequest;
use App\Features\Categories\Http\Requests\SaveCategoryRequest;
use App\Features\Categories\Queries\ListCategories;
use App\Http\Controllers\Controller;
use App\Models\ProductCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductCategoryController extends Controller
{
    public function index(Request $request, ListCategories $listCategories): InertiaResponse
    {
        return Inertia::render('Categories', $listCategories($request));
    }

    public function store(SaveCategoryRequest $request, SaveCategory $saveCategory): RedirectResponse
    {
        $saveCategory->handle($request->payload());

        return redirect()->route('categories.index');
    }

    public function update(
        SaveCategoryRequest $request,
        ProductCategory $productCategory,
        SaveCategory $saveCategory,
    ): RedirectResponse {
        $saveCategory->handle($request->payload(), $productCategory);

        return redirect()->route('categories.index');
    }

    public function destroy(ProductCategory $productCategory): RedirectResponse
    {
        $hasProductMasters = $productCategory->productMasters()->exists()
            || ProductCategory::query()
                ->where('parent_category_id', $productCategory->id)
                ->whereHas('productMasters')
                ->exists();

        if ($hasProductMasters) {
            return back()->withErrors([
                'category' => 'This category or its subcategories are used by product masters and cannot be deleted.',
            ]);
        }

        $productCategory->delete();

        return redirect()->route('categories.index');
    }

    public function import(
        ImportCategoriesRequest $request,
        ImportCategoriesFromCsv $importCategoriesFromCsv,
    ): RedirectResponse {
        return redirect()
            ->route('categories.index')
            ->with('success', $importCategoriesFromCsv->handle($request->csvFile()));
    }

    public function export(ExportCategoriesCsv $exportCategoriesCsv): StreamedResponse
    {
        return $exportCategoriesCsv->handle();
    }
}
