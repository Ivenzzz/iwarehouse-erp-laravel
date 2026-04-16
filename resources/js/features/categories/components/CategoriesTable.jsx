import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, Pencil, Rows3, Search, Trash2, X } from 'lucide-react';

export default function CategoriesTable({
    categories,
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
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search categories..."
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
                    <thead className="sticky top-0 z-10 bg-table-header text-table-header-foreground backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={() => onSort('name')}
                                >
                                    Category
                                    {sortIcon('name')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={() => onSort('parent')}
                                >
                                    Parent
                                    {sortIcon('parent')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-table-body text-table-body-foreground">
                        {categories.length > 0 ? (
                            categories.map((category) => (
                                <tr
                                    key={category.id}
                                    className="group border-b border-border align-top transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-foreground">
                                            {category.name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-4 text-foreground">
                                        {category.parent?.name ?? (
                                            <span className="text-muted-foreground italic">Top-level</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onEdit(category)}
                                                className="h-8 gap-1.5"
                                            >
                                                <Pencil className="size-3.5 text-warning" />
                                                Edit
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onDelete(category)}
                                                className="h-8 gap-1.5 border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            >
                                                <Trash2 className="size-3.5 text-destructive" />
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-muted-foreground/40" />
                                    <p className="text-lg font-semibold text-foreground">
                                        {filters.search
                                            ? 'No categories found'
                                            : 'No categories yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filters.search
                                            ? 'Try a different category search.'
                                            : 'Create a category manually or import a CSV containing category and subcategory pairs.'}
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
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} categories`
                        : 'Showing 0 categories'}
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
