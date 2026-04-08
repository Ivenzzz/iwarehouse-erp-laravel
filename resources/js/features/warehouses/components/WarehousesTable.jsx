import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, Pencil, Rows3, Search, Trash2, X } from 'lucide-react';

export default function WarehousesTable({
    warehouses,
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

        return filters.direction === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
    };

    const sortableHeader = (sort, label) => (
        <button type="button" className="inline-flex items-center gap-1 hover:text-slate-950" onClick={() => onSort(sort)}>
            {label}
            {sortIcon(sort)}
        </button>
    );

    return (
        <>
            <form onSubmit={onSearch} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search warehouses..."
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
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('name', 'Name')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('warehouse_type', 'Type')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('city', 'City')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('province', 'Province')}</th>
                            <th className="px-4 py-3 text-left font-semibold">Contact</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('sort_order', 'Sort Order')}</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {warehouses.length > 0 ? warehouses.map((warehouse) => (
                            <tr key={warehouse.id} className="border-b border-slate-200 align-top">
                                <td className="px-4 py-4 font-semibold text-slate-800">{warehouse.name}</td>
                                <td className="px-4 py-4 text-slate-600">{warehouse.warehouse_type}</td>
                                <td className="px-4 py-4 text-slate-600">{warehouse.city ?? <span className="text-slate-400">None</span>}</td>
                                <td className="px-4 py-4 text-slate-600">{warehouse.province ?? <span className="text-slate-400">None</span>}</td>
                                <td className="px-4 py-4 text-slate-600">
                                    <div>{warehouse.phone_number ?? 'No phone'}</div>
                                    <div className="text-xs text-slate-500">{warehouse.email ?? 'No email'}</div>
                                </td>
                                <td className="px-4 py-4 text-slate-600">{warehouse.sort_order}</td>
                                <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => onEdit(warehouse)}>
                                            <Pencil className="size-4" />
                                            Edit
                                        </Button>
                                        <Button type="button" variant="destructive" onClick={() => onDelete(warehouse)}>
                                            <Trash2 className="size-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-slate-300" />
                                    <p className="text-lg font-semibold text-slate-700">{filters.search ? 'No warehouses found' : 'No warehouses yet'}</p>
                                    <p className="mt-2 text-sm text-slate-500">
                                        {filters.search
                                            ? 'Try a different warehouse search.'
                                            : 'Create a warehouse manually or import a CSV containing warehouse details.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <p>{pagination.total > 0 ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} warehouses` : 'Showing 0 warehouses'}</p>

                {pagination.lastPage > 1 && (
                    <div className="flex flex-wrap justify-end gap-2">
                        {pagination.links.map((link, index) => {
                            const page = link.url ? Number(new URL(link.url).searchParams.get('page') ?? 1) : null;
                            const label = link.label.replace('&laquo; Previous', 'Previous').replace('Next &raquo;', 'Next');

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
