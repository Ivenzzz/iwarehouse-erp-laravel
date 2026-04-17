import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { ArrowDown, ArrowUp, Pencil, Rows3, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export default function BrandsTable({
    brands,
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
    const [selectedBrand, setSelectedBrand] = useState(null);

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
                        placeholder="Search brands or models..."
                        className="h-9 w-full border-0 border-b border-input bg-transparent pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:border-b-2 focus:ring-0"
                    />
                </div>

                <div className="flex gap-2">
                    {filters.search && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClearSearch}
                        >
                            <X className="size-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full border rounded-md text-sm">
                    <thead className="sticky top-0 z-10 bg-table-header backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-foreground/80"
                                    onClick={() => onSort('name')}
                                >
                                    Brand
                                    {sortIcon('name')}
                                </button>
                            </th>

                            <th className="px-4 py-3 text-left font-semibold">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 hover:text-foreground/80"
                                    onClick={() => onSort('models_count')}
                                >
                                    Models
                                    {sortIcon('models_count')}
                                </button>
                            </th>

                            <th className="px-4 py-3 text-right font-semibold">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className='bg-table-body text-table-body-foreground'>
                        {brands.length > 0 ? (
                            brands.map((brand) => (
                                <tr
                                    key={brand.id}
                                    className="border-b border-border align-top hover:bg-muted/50 transition-colors"
                                >
                                    <td className="px-4 py-4">
                                        <p className="font-semibold text-foreground">
                                            {brand.name}
                                        </p>
                                    </td>

                                    <td className="px-4 py-4">
                                        <Badge asChild variant="info">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedBrand(brand)}
                                                className="cursor-pointer"
                                            >
                                                {brand.models_count}{' '}
                                                {brand.models_count === 1 ? 'model' : 'models'}
                                            </button>
                                        </Badge>
                                    </td>

                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-3">
                                            <Button
                                                type="button"
                                                variant="warning"
                                                size="sm"
                                                onClick={() => onEdit(brand)}
                                            >
                                                Edit
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => onDelete(brand)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="px-6 py-12 text-center"
                                >
                                    <Rows3 className="mx-auto mb-4 size-10 text-muted-foreground/40" />

                                    <p className="text-lg font-semibold text-foreground">
                                        {filters.search
                                            ? 'No brands found'
                                            : 'No brands yet'}
                                    </p>

                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {filters.search
                                            ? 'Try a different brand or model search.'
                                            : 'Create a brand manually or import a CSV containing brand and model pairs.'}
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
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} brands`
                        : 'Showing 0 brands'}
                </p>

                {pagination.lastPage > 1 && (
                    <div className="flex flex-wrap justify-end gap-2">
                        {pagination.links.map((link, index) => {
                            const page = link.url
                                ? Number(
                                    new URL(link.url).searchParams.get('page') ??
                                    1
                                )
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

            <Dialog
                open={selectedBrand !== null}
                onOpenChange={(open) => !open && setSelectedBrand(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedBrand?.name ?? 'Brand'} Models
                        </DialogTitle>

                        <DialogDescription>
                            Models associated with this brand.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody>
                        {selectedBrand?.models.length > 0 ? (
                            <ul className="divide-y border border-border bg-card">
                                {selectedBrand.models.map((model) => (
                                    <li
                                        key={model.id}
                                        className="px-4 py-3 text-sm font-medium text-foreground"
                                    >
                                        {model.model_name}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                                No associated models
                            </div>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </>
    );
}
