import CustomerDialog from '@/features/customers/components/CustomerDialog';
import CustomersHeader from '@/features/customers/components/CustomersHeader';
import CustomersTable from '@/features/customers/components/CustomersTable';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function CustomersPage({
    customers,
    customerGroups,
    customerTypes,
    statuses,
    filters,
}) {
    const { errors } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    usePageToasts([errors?.file], 'destructive');

    const visitCustomers = (params) => {
        router.get(
            route('customers.index'),
            {
                search: params.search ?? filters.search,
                sort: params.sort ?? filters.sort,
                direction: params.direction ?? filters.direction,
                status: params.status ?? filters.status,
                customer_kind: params.customer_kind ?? filters.customer_kind,
                customer_group_id: params.customer_group_id ?? filters.customer_group_id,
                customer_type_id: params.customer_type_id ?? filters.customer_type_id,
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
        setEditingCustomer(null);
        setDialogOpen(true);
    };

    const openEdit = (customer) => {
        setEditingCustomer(customer);
        setDialogOpen(true);
    };

    const deleteCustomer = (customer) => {
        if (!window.confirm(`Delete ${customer.display_name}?`)) {
            return;
        }

        router.delete(route('customers.destroy', customer.id), {
            preserveScroll: true,
        });
    };

    const searchCustomers = (event) => {
        event.preventDefault();
        visitCustomers({ search: search.trim(), page: undefined });
    };

    const updateFilter = (field, value) => {
        visitCustomers({ [field]: value, page: undefined });
    };

    const clearFilters = () => {
        setSearch('');
        visitCustomers({
            search: '',
            status: '',
            customer_kind: '',
            customer_group_id: '',
            customer_type_id: '',
            page: undefined,
        });
    };

    const sortCustomers = (sort) => {
        const direction =
            filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';

        visitCustomers({ sort, direction, page: undefined });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('customers.import'),
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
        <AppShell title="Customers">
            <Head title="Customers" />

            <CustomerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                customer={editingCustomer}
                customerGroups={customerGroups}
                customerTypes={customerTypes}
                statuses={statuses}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex w-full max-w-full flex-col gap-4">
                <section className="bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <CustomersHeader
                        onImport={() => fileInputRef.current?.click()}
                        onCreate={openCreate}
                    />

                    <div className="space-y-5 px-5 py-5">
                        <section className="bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="px-5 py-5">
                                <CustomersTable
                                    customers={customers.data}
                                    pagination={{
                                        currentPage: customers.current_page,
                                        from: customers.from,
                                        lastPage: customers.last_page,
                                        links: customers.links,
                                        perPage: customers.per_page,
                                        to: customers.to,
                                        total: customers.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    customerGroups={customerGroups}
                                    customerTypes={customerTypes}
                                    statuses={statuses}
                                    onSearchChange={setSearch}
                                    onFilterChange={updateFilter}
                                    onSearch={searchCustomers}
                                    onClearFilters={clearFilters}
                                    onSort={sortCustomers}
                                    onPageChange={(page) => visitCustomers({ page })}
                                    onEdit={openEdit}
                                    onDelete={deleteCustomer}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
