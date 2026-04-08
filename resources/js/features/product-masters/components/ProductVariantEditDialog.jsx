import {
    buildVariantNamePreview,
    buildVariantSkuPreview,
    getEditableAttributeDefinitions,
} from '@/features/product-masters/lib/productVariantForm';
import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

function buildInitialForm(variant) {
    return {
        condition: variant?.condition ?? 'Brand New',
        attributes: { ...(variant?.attributes ?? {}) },
    };
}

export default function ProductVariantEditDialog({
    open,
    onOpenChange,
    productMaster,
    variant,
    variantDefinitions,
    onSaved,
}) {
    const [form, setForm] = useState(() => buildInitialForm(variant));
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setForm(buildInitialForm(variant));
        setErrors({});
    }, [open, variant]);

    const visibleDefinitions = useMemo(
        () =>
            getEditableAttributeDefinitions(
                variantDefinitions,
                productMaster?.supports_computer_variants ?? false,
            ),
        [productMaster?.supports_computer_variants, variantDefinitions],
    );

    const skuPreview = buildVariantSkuPreview(
        productMaster?.brand?.name ?? productMaster?.model?.brand?.name ?? '',
        productMaster?.model?.model_name ?? '',
        form.condition,
        form.attributes,
    );
    const namePreview = buildVariantNamePreview(
        productMaster?.brand?.name ?? productMaster?.model?.brand?.name ?? '',
        productMaster?.model?.model_name ?? '',
        form.condition,
        form.attributes,
    );

    const updateAttribute = (key, value) => {
        setForm((current) => ({
            ...current,
            attributes: {
                ...current.attributes,
                [key]: value,
            },
        }));
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!productMaster || !variant) {
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const response = await axios.patch(
                route('product-masters.variants.update', [
                    productMaster.id,
                    variant.id,
                ]),
                {
                    variant_name: namePreview,
                    sku: skuPreview,
                    condition: form.condition,
                    attributes: form.attributes,
                },
            );

            onSaved?.(response.data.variant);
            onOpenChange(false);
        } catch (error) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors ?? {});
            } else {
                setErrors({
                    submit: ['The variant could not be updated.'],
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Variant</DialogTitle>
                    <DialogDescription>
                        Variant name and SKU are generated from the brand, model, and selected attributes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="space-y-2">
                            <Label>Condition</Label>
                            <select
                                value={form.condition}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        condition: event.target.value,
                                    }))
                                }
                                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                                {(variantDefinitions?.conditions ?? []).map((condition) => (
                                    <option key={condition} value={condition}>
                                        {condition}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.condition?.[0]} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {visibleDefinitions.map((definition) => (
                                <div key={definition.key} className="space-y-2">
                                    <Label htmlFor={`variant-${definition.key}`}>
                                        {definition.label}
                                    </Label>
                                    <Input
                                        id={`variant-${definition.key}`}
                                        value={form.attributes[definition.key] ?? ''}
                                        onChange={(event) =>
                                            updateAttribute(
                                                definition.key,
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={
                                            errors[`attributes.${definition.key}`]?.[0]
                                        }
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="variant-name-preview">Variant Name</Label>
                                <Input
                                    id="variant-name-preview"
                                    value={namePreview}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant-sku-preview">SKU</Label>
                                <Input
                                    id="variant-sku-preview"
                                    value={skuPreview}
                                    readOnly
                                    disabled
                                />
                                <InputError message={errors.sku?.[0]} />
                            </div>
                        </div>

                        <InputError message={errors.submit?.[0]} />
                    </DialogBody>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Variant'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
