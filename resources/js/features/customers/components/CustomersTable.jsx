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
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search code, name, phone, email, or tax ID..."
                            className="h-9 w-full border-0 border-b border-input bg-transparent pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:border-b-2 focus:ring-0"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filters.status ?? ''}
                            onChange={(event) => onFilterChange('status', event.target.value)}
                            className="h-9 border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
                            className="h-9 border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
                            className="h-9 border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
                            className="h-9 border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClearFilters}
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
                                {sortableHeader('customer_code', 'Code')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('name', 'Customer')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('customer_kind', 'Kind')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('group', 'Group')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('type', 'Type')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('status', 'Status')}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-table-body text-table-body-foreground">
                        {customers.length > 0 ? (
                            customers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="group border-b border-border align-top transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-4 font-semibold text-foreground">
                                        {customer.customer_code}
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-foreground">
                                            {customer.display_name}
                                        </p>
                                        {customer.tax_id ? (
                                            <p className="text-xs text-muted-foreground">Tax ID: {customer.tax_id}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {kindLabels[customer.customer_kind] ?? customer.customer_kind}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {customer.group?.name ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {customer.type?.name ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {customer.contact?.phone ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {customer.contact?.email ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground border border-border">
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onEdit(customer)}
                                                className="hover:bg-warning/10 hover:text-warning"
                                            >
                                                <Pencil className="size-4 text-warning" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onDelete(customer)}
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
                                <td colSpan={9} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-muted-foreground/30" />
                                    <p className="text-lg font-semibold text-foreground">
                                        {hasFilters ? 'No customers found' : 'No customers yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
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

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => page && onPageChange(page)}
                                    className={!link.active ? "border-border text-foreground hover:bg-accent" : ""}
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
