import PaymentMethodDialog from '@/features/payment-methods/components/PaymentMethodDialog';
import PaymentMethodsHeader from '@/features/payment-methods/components/PaymentMethodsHeader';
import PaymentMethodsTable from '@/features/payment-methods/components/PaymentMethodsTable';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function PaymentMethodsPage({
    paymentMethods,
    paymentMethodTypes,
    filters,
}) {
    const { errors } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    usePageToasts([errors?.file], 'destructive');

    const visitPaymentMethods = (params) => {
        router.get(
            route('payment-methods.index'),
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
        setEditingPaymentMethod(null);
        setDialogOpen(true);
    };

    const openEdit = (paymentMethod) => {
        setEditingPaymentMethod(paymentMethod);
        setDialogOpen(true);
    };

    const deletePaymentMethod = (paymentMethod) => {
        if (!window.confirm(`Delete ${paymentMethod.name}?`)) {
            return;
        }

        router.delete(route('payment-methods.destroy', paymentMethod.id), {
            preserveScroll: true,
        });
    };

    const searchPaymentMethods = (event) => {
        event.preventDefault();

        visitPaymentMethods({
            search: search.trim(),
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visitPaymentMethods({
            search: '',
            page: undefined,
        });
    };

    const sortPaymentMethods = (sort) => {
        const direction =
            filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';

        visitPaymentMethods({
            sort,
            direction,
            page: undefined,
        });
    };

    const goToPage = (page) => {
        visitPaymentMethods({ page });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('payment-methods.import'),
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
        <AppShell title="Payment Methods">
            <Head title="Payment Methods" />

            <PaymentMethodDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                paymentMethod={editingPaymentMethod}
                paymentMethodTypes={paymentMethodTypes}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex max-w-full flex-col gap-5">
                <section className="bg-background">
                    <PaymentMethodsHeader
                        onImport={() => fileInputRef.current?.click()}
                        onCreate={openCreate}
                    />

                    <div className="space-y-5">
                        <section className="bg-accent">
                            <div className="px-5 py-5">
                                <PaymentMethodsTable
                                    paymentMethods={paymentMethods.data}
                                    pagination={{
                                        currentPage: paymentMethods.current_page,
                                        from: paymentMethods.from,
                                        lastPage: paymentMethods.last_page,
                                        links: paymentMethods.links,
                                        perPage: paymentMethods.per_page,
                                        to: paymentMethods.to,
                                        total: paymentMethods.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    onSearchChange={setSearch}
                                    onSearch={searchPaymentMethods}
                                    onClearSearch={clearSearch}
                                    onSort={sortPaymentMethods}
                                    onPageChange={goToPage}
                                    onEdit={openEdit}
                                    onDelete={deletePaymentMethod}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
