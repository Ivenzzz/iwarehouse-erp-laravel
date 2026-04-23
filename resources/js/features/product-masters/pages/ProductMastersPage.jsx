import ProductVariantGenerateDialog from '@/features/product-masters/components/ProductVariantGenerateDialog';
import ProductVariantsDialog from '@/features/product-masters/components/ProductVariantsDialog';
import ProductMasterDetailsDialog from '@/features/product-masters/components/ProductMasterDetailsDialog';
import ProductMasterDialog from '@/features/product-masters/components/ProductMasterDialog';
import ProductMastersHeader from '@/features/product-masters/components/ProductMastersHeader';
import ProductMastersImportDialog from '@/features/product-masters/components/ProductMastersImportDialog';
import ProductMastersImportSummaryDialog from '@/features/product-masters/components/ProductMastersImportSummaryDialog';
import ProductMastersTable from '@/features/product-masters/components/ProductMastersTable';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function ProductMastersPage({
    productMasters,
    brands,
    categories,
    specDefinitions,
    variantDefinitions,
    filters,
}) {
    const { errors, flash } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [variantsOpen, setVariantsOpen] = useState(false);
    const [importGuideOpen, setImportGuideOpen] = useState(false);
    const [importSummaryOpen, setImportSummaryOpen] = useState(false);
    const [editingProductMaster, setEditingProductMaster] = useState(null);
    const [viewingProductMaster, setViewingProductMaster] = useState(null);
    const [generatingProductMaster, setGeneratingProductMaster] = useState(null);
    const [managingProductMaster, setManagingProductMaster] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    usePageToasts([errors?.category, errors?.brand], 'destructive');

    useEffect(() => {
        if (flash?.import_summary) {
            setImportSummaryOpen(true);
        }
    }, [flash?.import_summary]);

    const visitProductMasters = (params) => {
        router.get(
            route('product-masters.index'),
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
        setEditingProductMaster(null);
        setDialogOpen(true);
    };

    const openEdit = (productMaster) => {
        setEditingProductMaster(productMaster);
        setDialogOpen(true);
    };

    const openDetails = (productMaster) => {
        setViewingProductMaster(productMaster);
        setDetailsOpen(true);
    };

    const openGenerate = (productMaster) => {
        setGeneratingProductMaster(productMaster);
        setGenerateOpen(true);
    };

    const openVariants = (productMaster) => {
        setManagingProductMaster(productMaster);
        setVariantsOpen(true);
    };

    const refreshProductMasters = () => {
        router.reload({
            only: ['productMasters'],
            preserveScroll: true,
            preserveState: true,
        });
    };

    const deleteProductMaster = (productMaster) => {
        if (!window.confirm(`Delete ${productMaster.product_name}?`)) {
            return;
        }

        router.delete(route('product-masters.destroy', productMaster.id), {
            preserveScroll: true,
        });
    };

    const searchProductMasters = (event) => {
        event.preventDefault();
        visitProductMasters({ search: search.trim(), page: undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visitProductMasters({ search: '', page: undefined });
    };

    const sortProductMasters = (sort) => {
        const direction =
            filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';

        visitProductMasters({ sort, direction, page: undefined });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('product-masters.import'),
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
        <AppShell title="Product Masters">
            <Head title="Product Masters" />

            <ProductMasterDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                productMaster={editingProductMaster}
                brands={brands}
                categories={categories}
                specDefinitions={specDefinitions}
            />

            <ProductMasterDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                productMaster={viewingProductMaster}
                specDefinitions={specDefinitions}
            />

            <ProductVariantGenerateDialog
                open={generateOpen}
                onOpenChange={setGenerateOpen}
                productMaster={generatingProductMaster}
                variantDefinitions={variantDefinitions}
                onGenerated={() => {
                    refreshProductMasters();
                }}
            />

            <ProductVariantsDialog
                open={variantsOpen}
                onOpenChange={setVariantsOpen}
                productMaster={managingProductMaster}
                variantDefinitions={variantDefinitions}
                onGenerate={openGenerate}
                onVariantDeleted={() => {
                    refreshProductMasters();
                }}
            />

            <ProductMastersImportDialog
                open={importGuideOpen}
                onOpenChange={setImportGuideOpen}
                onUpload={() => fileInputRef.current?.click()}
            />

            <ProductMastersImportSummaryDialog
                open={importSummaryOpen}
                onOpenChange={setImportSummaryOpen}
                summary={flash?.import_summary ?? null}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex w-full max-w-full flex-col gap-4">
                <section className="bg-background">
                    <ProductMastersHeader
                        onImport={() => setImportGuideOpen(true)}
                        onCreate={openCreate}
                    />

                    <div className="space-y-5">
                        <section className="bg-accent">
                            <div className="px-5 py-5">
                                <ProductMastersTable
                                    productMasters={productMasters.data}
                                    pagination={{
                                        currentPage: productMasters.current_page,
                                        from: productMasters.from,
                                        lastPage: productMasters.last_page,
                                        links: productMasters.links,
                                        perPage: productMasters.per_page,
                                        to: productMasters.to,
                                        total: productMasters.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    onSearchChange={setSearch}
                                    onSearch={searchProductMasters}
                                    onClearSearch={clearSearch}
                                    onSort={sortProductMasters}
                                    onPageChange={(page) => visitProductMasters({ page })}
                                    onView={openDetails}
                                    onEdit={openEdit}
                                    onDelete={deleteProductMaster}
                                    onGenerate={openGenerate}
                                    onManageVariants={openVariants}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
