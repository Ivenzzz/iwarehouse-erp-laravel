import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, Eye, PackageSearch, SquarePen, Search, Trash2, WandSparkles, X } from 'lucide-react';

export default function ProductMastersTable({
    productMasters,
    pagination,
    filters,
    search,
    onSearchChange,
    onSearch,
    onClearSearch,
    onSort,
    onPageChange,
    onView,
    onEdit,
    onDelete,
    onGenerate,
    onManageVariants,
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
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search SKU, brand, model, or category..."
                        className="h-9 w-full border-0 border-b border-input bg-transparent pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:border-b-2 focus:ring-0"
                    />
                </div>

                <div className="flex gap-2">
                    {filters.search && (
                        <Button type="button" variant="outline" onClick={onClearSearch}>
                            <X className="size-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-table-header text-table-header-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={() => onSort('name')}
                                >
                                    Name
                                    {sortIcon('name')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={() => onSort('category')}
                                >
                                    Category
                                    {sortIcon('category')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Variants</th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-table-body text-table-body-foreground">
                        {productMasters.length > 0 ? (
                            productMasters.map((productMaster) => (
                                <tr
                                    key={productMaster.id}
                                    className="group border-b border-border align-top transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                >
                                    {/* Product Name */}
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-foreground">
                                            {productMaster.product_name}
                                        </p>
                                    </td>

                                    {/* Category */}
                                    <td className="px-4 py-4">
                                        <p className="text-foreground">
                                            {productMaster.category?.name ?? 'No category'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {productMaster.subcategory.name}
                                        </p>
                                    </td>

                                    {/* Variants */}
                                    <td className="px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={() => onManageVariants(productMaster)}
                                            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                        >
                                            <Badge
                                                className="px-2 py-1 text-xs font-medium rounded-md"
                                            >

                                                {productMaster.variants_count} variant
                                                {productMaster.variants_count === 1 ? '' : 's'}
                                            </Badge>
                                        </button>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-4">
                                            {/* Generate */}
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onGenerate(productMaster)}
                                                title="Generate"
                                                className="hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                                            >
                                                <WandSparkles className="size-4 text-cyan-500" />
                                            </Button>

                                            {/* View */}
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onView(productMaster)}
                                                title="View"
                                                className="hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                            >
                                                <Eye className="size-4 text-green-500" />
                                            </Button>

                                            {/* Edit */}
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onEdit(productMaster)}
                                                title="Edit"
                                                className="hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
                                            >
                                                <SquarePen className="size-4 text-sky-500" />
                                            </Button>

                                            {/* Delete */}
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onDelete(productMaster)}
                                                title="Delete"
                                                className="hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <PackageSearch className="mx-auto mb-4 size-10 text-muted-foreground/40" />

                                    <p className="text-lg font-semibold text-foreground">
                                        {filters.search
                                            ? 'No product masters found'
                                            : 'No product masters yet'}
                                    </p>

                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filters.search
                                            ? 'Try a different SKU, brand, model, or category search.'
                                            : 'Create a product master manually or import a CSV.'}
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
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} product masters`
                        : 'Showing 0 product masters'}
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
