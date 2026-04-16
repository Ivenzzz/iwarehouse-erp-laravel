import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, Pencil, Rows3, Search, Trash2, X } from 'lucide-react';

export default function SuppliersTable({
    suppliers,
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
            {/* Search Bar */}
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
                        placeholder="Search suppliers..."
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

            {/* Table Container */}
            <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-table-header text-table-header-foreground backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('supplier_code', 'Code')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('legal_business_name', 'Legal Business Name')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('trade_name', 'Trade Name')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Mobile</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('status', 'Status')}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-table-body text-table-body-foreground">
                        {suppliers.length > 0 ? (
                            suppliers.map((supplier) => (
                                <tr
                                    key={supplier.id}
                                    className="group border-b border-border align-top transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-4 font-semibold text-foreground">
                                        {supplier.supplier_code}
                                    </td>
                                    <td className="px-4 py-4 font-semibold text-foreground">
                                        {supplier.legal_business_name}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {supplier.trade_name ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {supplier.email ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-muted-foreground">
                                        {supplier.mobile ?? (
                                            <span className="text-muted-foreground/50 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground border border-border">
                                            {supplier.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onEdit(supplier)}
                                                className="hover:bg-warning/10 hover:text-warning"
                                            >
                                                <Pencil className="size-4 text-warning" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onDelete(supplier)}
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
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-muted-foreground/30" />
                                    <p className="text-lg font-semibold text-foreground">
                                        {filters.search ? 'No suppliers found' : 'No suppliers yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filters.search
                                            ? 'Try a different supplier search.'
                                            : 'Create a supplier manually or import a CSV containing supplier details.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Section */}
            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                    {pagination.total > 0
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} suppliers`
                        : 'Showing 0 suppliers'}
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
