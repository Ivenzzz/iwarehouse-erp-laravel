import { formatPaymentMethodType } from '@/features/payment-methods/lib/paymentMethodForm';
import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, CreditCard, Pencil, Search, Trash2, X } from 'lucide-react';

export default function PaymentMethodsTable({
    paymentMethods,
    pagination,
    filters,
    search,
    onSearchChange,
    onSearch,
    onClearSearch,
    onSort,
    onPageChange,
    onEdit,
    onDelete,
}) {
    const sortIcon = (sort) => {
        if (filters.sort !== sort) {
            return null;
        }

        return filters.direction === 'asc' ? (
            <ArrowUp className="size-3.5" />
        ) : (
            <ArrowDown className="size-3.5" />
        );
    };

    return (
        <>
            <form
                onSubmit={onSearch}
                className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start"
            >
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search payment methods..."
                        className="h-9 w-full border-0 border-b border-input bg-transparent pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:border-b-2 focus:ring-0"
                    />
                </div>

                <div className="flex gap-2">
                    {filters.search && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClearSearch}
                            className="h-9 border-border text-foreground hover:bg-accent"
                        >
                            <X className="size-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-table-header text-table-header-foreground backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-slate-950"
                                    onClick={() => onSort('name')}
                                >
                                    Name
                                    {sortIcon('name')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-slate-950"
                                    onClick={() => onSort('type')}
                                >
                                    Type
                                    {sortIcon('type')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Logo</th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-table-body text-table-body-foreground">
                        {paymentMethods.length > 0 ? (
                            paymentMethods.map((paymentMethod) => (
                                <tr
                                    key={paymentMethod.id}
                                    className="group border-b border-border align-top transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-foreground">
                                            {paymentMethod.name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground border border-border">
                                            {formatPaymentMethodType(paymentMethod.type)}
                                        </span>
                                    </td>
                                    <td className="max-w-[280px] truncate px-4 py-4 text-muted-foreground">
                                        {paymentMethod.logo || 'No logo'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onEdit(paymentMethod)}
                                                className="hover:bg-warning/10 hover:text-warning"
                                            >
                                                <Pencil className="size-4 text-warning" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onDelete(paymentMethod)}
                                                className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <CreditCard className="mx-auto mb-4 size-10 text-muted-foreground/30" />
                                    <p className="text-lg font-semibold text-foreground">
                                        {filters.search
                                            ? 'No payment methods found'
                                            : 'No payment methods yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filters.search
                                            ? 'Try a different payment method search.'
                                            : 'Create a payment method manually or import a CSV.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                    {pagination.total > 0
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} payment methods`
                        : 'Showing 0 payment methods'}
                </p>

                {pagination.lastPage > 1 && (
                    <div className="flex flex-wrap justify-end gap-2">
                        {pagination.links.map((link, index) => {
                            const page = link.url
                                ? Number(new URL(link.url).searchParams.get('page') ?? 1)
                                : null;
                            const label = link.label
                                .replace('&laquo; Previous', 'Previous')
                                .replace('Next &raquo;', 'Next');

                            return (
                                <Button
                                    key={`${link.label}-${index}`}
                                    type="button"
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => page && onPageChange(page)}
                                    className={!link.active ? 'border-border text-foreground hover:bg-accent' : ''}
                                >
                                    {label}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
