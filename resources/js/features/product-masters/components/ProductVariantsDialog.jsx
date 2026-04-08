import ProductVariantEditDialog from '@/features/product-masters/components/ProductVariantEditDialog';
import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Pencil, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProductVariantsDialog({
    open,
    onOpenChange,
    productMaster,
    variantDefinitions,
    onGenerate,
    onVariantDeleted,
}) {
    const [variants, setVariants] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingVariant, setEditingVariant] = useState(null);
    const [editOpen, setEditOpen] = useState(false);

    const loadVariants = async (page = 1, nextSearch = search) => {
        if (!productMaster) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.get(
                route('product-masters.variants.index', productMaster.id),
                {
                    params: {
                        search: nextSearch,
                        page,
                    },
                },
            );

            setVariants(response.data.variants.data);
            setPagination(response.data.variants);
        } catch {
            setError('The variants could not be loaded.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !productMaster) {
            return;
        }

        setSearch('');
        loadVariants(1, '');
    }, [open, productMaster?.id]);

    const deleteVariant = async (variant) => {
        if (!productMaster) {
            return;
        }

        if (!window.confirm(`Delete ${variant.variant_name}?`)) {
            return;
        }

        try {
            await axios.delete(
                route('product-masters.variants.destroy', [
                    productMaster.id,
                    variant.id,
                ]),
            );

            onVariantDeleted?.(productMaster);

            const nextPage =
                variants.length === 1 && (pagination?.current_page ?? 1) > 1
                    ? pagination.current_page - 1
                    : pagination?.current_page ?? 1;

            loadVariants(nextPage);
        } catch {
            setError('The variant could not be deleted.');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>
                            {productMaster
                                ? `${productMaster.product_name} Variants`
                                : 'Variants'}
                        </DialogTitle>
                        <DialogDescription>
                            Search, review, edit, and remove generated variants.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody className="space-y-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    loadVariants(1);
                                }}
                                className="flex flex-1 gap-2"
                            >
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search variant SKU, name, or attribute..."
                                        className="h-9 w-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                                <Button type="submit" variant="outline">
                                    Search
                                </Button>
                                {search && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setSearch('');
                                            loadVariants(1, '');
                                        }}
                                    >
                                        <X className="size-4" />
                                        Clear
                                    </Button>
                                )}
                            </form>

                            <Button
                                type="button"
                                onClick={() => productMaster && onGenerate?.(productMaster)}
                            >
                                Generate Variants
                            </Button>
                        </div>

                        <InputError message={error} />

                        <div className="overflow-x-auto border border-slate-200">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-4 py-3 text-left font-semibold">
                                            SKU
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold">
                                            Variant
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold">
                                            Condition
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold">
                                            Attributes
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-slate-500"
                                            >
                                                Loading variants...
                                            </td>
                                        </tr>
                                    ) : variants.length > 0 ? (
                                        variants.map((variant) => (
                                            <tr
                                                key={variant.id}
                                                className="border-b border-slate-200 align-top"
                                            >
                                                <td className="px-4 py-4 font-semibold text-slate-800">
                                                    {variant.sku}
                                                </td>
                                                <td className="px-4 py-4 text-slate-800">
                                                    {variant.variant_name}
                                                </td>
                                                <td className="px-4 py-4 text-slate-700">
                                                    {variant.condition}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {variant.tags.map((tag) => (
                                                            <span
                                                                key={`${variant.id}-${tag.key}`}
                                                                className="inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                                            >
                                                                <span className="font-medium">
                                                                    {tag.label}:
                                                                </span>
                                                                {tag.value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingVariant(
                                                                    variant,
                                                                );
                                                                setEditOpen(true);
                                                            }}
                                                        >
                                                            <Pencil className="size-4" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() =>
                                                                deleteVariant(variant)
                                                            }
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
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-slate-500"
                                            >
                                                No variants found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pagination?.last_page > 1 && (
                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <p>
                                    Showing {pagination.from} to {pagination.to} of{' '}
                                    {pagination.total} variants
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={pagination.current_page <= 1}
                                        onClick={() =>
                                            loadVariants(pagination.current_page - 1)
                                        }
                                    >
                                        <ArrowLeft className="size-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            pagination.current_page >= pagination.last_page
                                        }
                                        onClick={() =>
                                            loadVariants(pagination.current_page + 1)
                                        }
                                    >
                                        Next
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>

            <ProductVariantEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                productMaster={productMaster}
                variant={editingVariant}
                variantDefinitions={variantDefinitions}
                onSaved={() => {
                    loadVariants(pagination?.current_page ?? 1);
                }}
            />
        </>
    );
}
