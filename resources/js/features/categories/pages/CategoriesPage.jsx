import CategoryDialog from '@/features/categories/components/CategoryDialog';
import CategoriesHeader from '@/features/categories/components/CategoriesHeader';
import CategoriesTable from '@/features/categories/components/CategoriesTable';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function CategoriesPage({ categories, topLevelCategories, filters }) {
    const { errors, flash } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    const visitCategories = (params) => {
        router.get(
            route('categories.index'),
            {
                search: params.search ?? filters.search,
                sort: params.sort ?? filters.sort,
                direction: params.direction ?? filters.direction,
                page: params.page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openCreate = () => {
        setEditingCategory(null);
        setDialogOpen(true);
    };

    const openEdit = (category) => {
        setEditingCategory(category);
        setDialogOpen(true);
    };

    const deleteCategory = (category) => {
        if (!window.confirm(`Delete ${category.name}? Subcategories will become top-level categories.`)) {
            return;
        }

        router.delete(route('categories.destroy', category.id), {
            preserveScroll: true,
        });
    };

    const searchCategories = (event) => {
        event.preventDefault();

        visitCategories({
            search: search.trim(),
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visitCategories({
            search: '',
            page: undefined,
        });
    };

    const sortCategories = (sort) => {
        const direction =
            filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';

        visitCategories({
            sort,
            direction,
            page: undefined,
        });
    };

    const goToPage = (page) => {
        visitCategories({ page });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('categories.import'),
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    event.target.value = '';
                },
            },
        );
    };

    return (
        <AppShell title="Categories">
            <Head title="Categories" />

            <CategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                category={editingCategory}
                topLevelCategories={topLevelCategories}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
                <section className="bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <CategoriesHeader
                        onImport={() => fileInputRef.current?.click()}
                        onCreate={openCreate}
                    />

                    <div className="space-y-5 px-5 py-5">
                        {flash?.success && (
                            <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                {flash.success}
                            </div>
                        )}

                        {errors?.file && (
                            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {errors.file}
                            </div>
                        )}

                        <section className="bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="px-5 py-5">
                                <CategoriesTable
                                    categories={categories.data}
                                    pagination={{
                                        currentPage: categories.current_page,
                                        from: categories.from,
                                        lastPage: categories.last_page,
                                        links: categories.links,
                                        perPage: categories.per_page,
                                        to: categories.to,
                                        total: categories.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    onSearchChange={setSearch}
                                    onSearch={searchCategories}
                                    onClearSearch={clearSearch}
                                    onSort={sortCategories}
                                    onPageChange={goToPage}
                                    onEdit={openEdit}
                                    onDelete={deleteCategory}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
