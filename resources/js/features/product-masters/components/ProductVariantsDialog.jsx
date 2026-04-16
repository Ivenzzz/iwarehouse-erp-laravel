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
import { Badge } from '@/shared/components/ui/badge';

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
                <DialogContent className="max-w-5xl bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {productMaster
                                ? `${productMaster.product_name} Variants`
                                : 'Variants'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
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
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search variant SKU, name, or attribute..."
                                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 focus:border-ring"
                                    />
                                </div>
                                <Button type="submit" variant="outline">
                                    Search
                                </Button>
                                {search && (
                                    <Button
                                        type="button"
                                        variant="ghost"
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

                        <div className="overflow-x-auto rounded-md border border-border">
                            <table className="min-w-full text-xs">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left font-semibold">SKU</th>
                                        <th className="px-4 py-3 text-left font-semibold">Variant</th>
                                        <th className="px-4 py-3 text-left font-semibold">Condition</th>
                                        <th className="px-4 py-3 text-left font-semibold">Attributes</th>
                                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-background">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                Loading variants...
                                            </td>
                                        </tr>
                                    ) : variants.length > 0 ? (
                                        variants.map((variant) => (
                                            <tr
                                                key={variant.id}
                                                className="border-b border-border align-top transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-4 font-semibold text-foreground">
                                                    {variant.sku}
                                                </td>
                                                <td className="px-4 py-4 text-foreground">
                                                    {variant.variant_name}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <Badge
                                                        variant={variant.condition === 'Brand New' ? 'success' : 'warning'}
                                                        size="sm"
                                                        className="capitalize"
                                                    >
                                                        {variant.condition}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {/* Changed flex-wrap to flex-col to stack them */}
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        {variant.tags.map((tag) => (
                                                            <Badge
                                                                key={`${variant.id}-${tag.key}`}
                                                                variant="info" // Using the premium semantic info badge
                                                                size="xs"      // Smaller size fits better in a vertical stack
                                                            >
                                                                <span className="opacity-70 font-medium">
                                                                    {tag.label}:
                                                                </span>
                                                                <span>{tag.value}</span>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => {
                                                                setEditingVariant(variant);
                                                                setEditOpen(true);
                                                            }}
                                                            title="Edit"
                                                        >
                                                            <Pencil className="size-4 text-primary" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => deleteVariant(variant)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="size-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                                No variants found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pagination?.last_page > 1 && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <p>
                                    Showing {pagination.from} to {pagination.to} of{' '}
                                    <span className="font-medium text-foreground">{pagination.total}</span> variants
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.current_page <= 1}
                                        onClick={() => loadVariants(pagination.current_page - 1)}
                                    >
                                        <ArrowLeft className="mr-2 size-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.current_page >= pagination.last_page}
                                        onClick={() => loadVariants(pagination.current_page + 1)}
                                    >
                                        Next
                                        <ArrowRight className="ml-2 size-4" />
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
