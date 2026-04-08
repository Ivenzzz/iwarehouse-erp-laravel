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
                className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search payment methods..."
                        className="h-9 w-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                </div>

                <div className="flex gap-2">
                    {filters.search && (
                        <Button type="button" variant="outline" onClick={onClearSearch}>
                            <X className="size-4" />
                            Clear
                        </Button>
                    )}
                    <Button type="submit" variant="outline">
                        <Search className="size-4" />
                        Search
                    </Button>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left font-semibold">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-slate-950"
                                    onClick={() => onSort('name')}
                                >
                                    Name
                                    {sortIcon('name')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-slate-950"
                                    onClick={() => onSort('type')}
                                >
                                    Type
                                    {sortIcon('type')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">Logo</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {paymentMethods.length > 0 ? (
                            paymentMethods.map((paymentMethod) => (
                                <tr
                                    key={paymentMethod.id}
                                    className="border-b border-slate-200 align-top"
                                >
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-slate-800">
                                            {paymentMethod.name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                                            {formatPaymentMethodType(paymentMethod.type)}
                                        </span>
                                    </td>
                                    <td className="max-w-[280px] truncate px-4 py-4 text-slate-600">
                                        {paymentMethod.logo || 'No logo'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => onEdit(paymentMethod)}
                                            >
                                                <Pencil className="size-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => onDelete(paymentMethod)}
                                            >
                                                <Trash2 className="size-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <CreditCard className="mx-auto mb-4 size-10 text-slate-300" />
                                    <p className="text-lg font-semibold text-slate-700">
                                        {filters.search
                                            ? 'No payment methods found'
                                            : 'No payment methods yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-500">
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

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
                                    disabled={!link.url}
                                    onClick={() => page && onPageChange(page)}
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
