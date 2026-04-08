import WarehouseDialog from '@/features/warehouses/components/WarehouseDialog';
import WarehousesHeader from '@/features/warehouses/components/WarehousesHeader';
import WarehousesTable from '@/features/warehouses/components/WarehousesTable';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function WarehousesPage({ warehouses, warehouseTypes, filters }) {
    const { errors } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    usePageToasts([errors?.file, errors?.warehouse], 'destructive');

    const visitWarehouses = (params) => {
        router.get(route('warehouses.index'), {
            search: params.search ?? filters.search,
            sort: params.sort ?? filters.sort,
            direction: params.direction ?? filters.direction,
            page: params.page,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const openCreate = () => {
        setEditingWarehouse(null);
        setDialogOpen(true);
    };

    const openEdit = (warehouse) => {
        setEditingWarehouse(warehouse);
        setDialogOpen(true);
    };

    const deleteWarehouse = (warehouse) => {
        if (!window.confirm(`Delete ${warehouse.name}?`)) {
            return;
        }

        router.delete(route('warehouses.destroy', warehouse.id), {
            preserveScroll: true,
        });
    };

    const searchWarehouses = (event) => {
        event.preventDefault();
        visitWarehouses({ search: search.trim(), page: undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visitWarehouses({ search: '', page: undefined });
    };

    const sortWarehouses = (sort) => {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        visitWarehouses({ sort, direction, page: undefined });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(route('warehouses.import'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                event.target.value = '';
            },
        });
    };

    return (
        <AppShell title="Warehouses">
            <Head title="Warehouses" />

            <WarehouseDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                warehouse={editingWarehouse}
                warehouseTypes={warehouseTypes}
            />

            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
                <section className="bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <WarehousesHeader onImport={() => fileInputRef.current?.click()} onCreate={openCreate} />

                    <div className="space-y-5 px-5 py-5">
                        <section className="bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="px-5 py-5">
                                <WarehousesTable
                                    warehouses={warehouses.data}
                                    pagination={{
                                        currentPage: warehouses.current_page,
                                        from: warehouses.from,
                                        lastPage: warehouses.last_page,
                                        links: warehouses.links,
                                        perPage: warehouses.per_page,
                                        to: warehouses.to,
                                        total: warehouses.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    onSearchChange={setSearch}
                                    onSearch={searchWarehouses}
                                    onClearSearch={clearSearch}
                                    onSort={sortWarehouses}
                                    onPageChange={(page) => visitWarehouses({ page })}
                                    onEdit={openEdit}
                                    onDelete={deleteWarehouse}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
