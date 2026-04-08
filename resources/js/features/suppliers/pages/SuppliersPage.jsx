import SupplierDialog from '@/features/suppliers/components/SupplierDialog';
import SuppliersHeader from '@/features/suppliers/components/SuppliersHeader';
import SuppliersTable from '@/features/suppliers/components/SuppliersTable';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function SuppliersPage({ suppliers, filters }) {
    const { errors } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    usePageToasts([errors?.file], 'destructive');

    const visitSuppliers = (params) => {
        router.get(
            route('suppliers.index'),
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
        setEditingSupplier(null);
        setDialogOpen(true);
    };

    const openEdit = (supplier) => {
        setEditingSupplier(supplier);
        setDialogOpen(true);
    };

    const deleteSupplier = (supplier) => {
        if (!window.confirm(`Delete ${supplier.legal_business_name}?`)) {
            return;
        }

        router.delete(route('suppliers.destroy', supplier.id), {
            preserveScroll: true,
        });
    };

    const searchSuppliers = (event) => {
        event.preventDefault();

        visitSuppliers({
            search: search.trim(),
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visitSuppliers({
            search: '',
            page: undefined,
        });
    };

    const sortSuppliers = (sort) => {
        const direction =
            filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';

        visitSuppliers({
            sort,
            direction,
            page: undefined,
        });
    };

    const goToPage = (page) => {
        visitSuppliers({ page });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('suppliers.import'),
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
        <AppShell title="Suppliers">
            <Head title="Suppliers" />

            <SupplierDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                supplier={editingSupplier}
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
                    <SuppliersHeader
                        onImport={() => fileInputRef.current?.click()}
                        onCreate={openCreate}
                    />

                    <div className="space-y-5 px-5 py-5">
                        <section className="bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="px-5 py-5">
                                <SuppliersTable
                                    suppliers={suppliers.data}
                                    pagination={{
                                        currentPage: suppliers.current_page,
                                        from: suppliers.from,
                                        lastPage: suppliers.last_page,
                                        links: suppliers.links,
                                        perPage: suppliers.per_page,
                                        to: suppliers.to,
                                        total: suppliers.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    onSearchChange={setSearch}
                                    onSearch={searchSuppliers}
                                    onClearSearch={clearSearch}
                                    onSort={sortSuppliers}
                                    onPageChange={goToPage}
                                    onEdit={openEdit}
                                    onDelete={deleteSupplier}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
