import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, Pencil, Rows3, Search, Trash2, X } from 'lucide-react';

const kindLabels = {
    person: 'Person',
    organization: 'Organization',
};

export default function CustomersTable({
    customers,
    pagination,
    filters,
    search,
    customerGroups,
    customerTypes,
    statuses,
    onSearchChange,
    onFilterChange,
    onSearch,
    onClearFilters,
    onSort,
    onPageChange,
    onEdit,
    onDelete,
}) {
    const hasFilters = Boolean(
        filters.search ||
            filters.status ||
            filters.customer_kind ||
            filters.customer_group_id ||
            filters.customer_type_id,
    );

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

    const sortableHeader = (sort, label) => (
        <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-slate-950"
            onClick={() => onSort(sort)}
        >
            {label}
            {sortIcon(sort)}
        </button>
    );

    return (
        <>
            <form onSubmit={onSearch} className="mb-4 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="relative w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search code, name, phone, email, or tax ID..."
                            className="h-9 w-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="flex flex-rowgap-2">
                        <select
                            value={filters.status ?? ''}
                            onChange={(event) => onFilterChange('status', event.target.value)}
                            className="h-9 border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">All Statuses</option>
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.customer_kind ?? ''}
                            onChange={(event) =>
                                onFilterChange('customer_kind', event.target.value)
                            }
                            className="h-9 border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">All Kinds</option>
                            <option value="person">Person</option>
                            <option value="organization">Organization</option>
                        </select>
                        <select
                            value={filters.customer_group_id ?? ''}
                            onChange={(event) =>
                                onFilterChange('customer_group_id', event.target.value)
                            }
                            className="h-9 border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">All Groups</option>
                            {customerGroups.map((group) => (
                                <option key={group.id} value={String(group.id)}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.customer_type_id ?? ''}
                            onChange={(event) =>
                                onFilterChange('customer_type_id', event.target.value)
                            }
                            className="h-9 border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">All Types</option>
                            {customerTypes.map((type) => (
                                <option key={type.id} value={String(type.id)}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    {hasFilters && (
                        <Button type="button" variant="outline" onClick={onClearFilters}>
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
                                {sortableHeader('customer_code', 'Code')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                {sortableHeader('name', 'Customer')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                {sortableHeader('customer_kind', 'Kind')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                {sortableHeader('group', 'Group')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                {sortableHeader('type', 'Type')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">Phone</th>
                            <th className="px-4 py-3 text-left font-semibold">Email</th>
                            <th className="px-4 py-3 text-left font-semibold">
                                {sortableHeader('status', 'Status')}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {customers.length > 0 ? (
                            customers.map((customer) => (
                                <tr key={customer.id} className="border-b border-slate-200 align-top">
                                    <td className="px-4 py-4 font-semibold text-slate-700">
                                        {customer.customer_code}
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-slate-800">
                                            {customer.display_name}
                                        </p>
                                        {customer.tax_id ? (
                                            <p className="text-xs text-slate-500">Tax ID: {customer.tax_id}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {kindLabels[customer.customer_kind] ?? customer.customer_kind}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {customer.group?.name ?? <span className="text-slate-400">None</span>}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {customer.type?.name ?? <span className="text-slate-400">None</span>}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {customer.contact?.phone ?? <span className="text-slate-400">None</span>}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {customer.contact?.email ?? <span className="text-slate-400">None</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="outline" onClick={() => onEdit(customer)}>
                                                <Pencil className="size-4" />
                                                Edit
                                            </Button>
                                            <Button type="button" variant="destructive" onClick={() => onDelete(customer)}>
                                                <Trash2 className="size-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-slate-300" />
                                    <p className="text-lg font-semibold text-slate-700">
                                        {hasFilters ? 'No customers found' : 'No customers yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-500">
                                        {hasFilters
                                            ? 'Try different customer filters or search terms.'
                                            : 'Create a customer manually or import a CSV containing customer details.'}
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
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} customers`
                        : 'Showing 0 customers'}
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
