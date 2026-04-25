import {
    buildVariantNamePreview,
    buildVariantSkuPreview,
    getEditableAttributeDefinitions,
    sanitizeVariantAttributes,
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
        () => getEditableAttributeDefinitions(variantDefinitions),
        [variantDefinitions],
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
                    attributes: sanitizeVariantAttributes(
                        form.attributes,
                        variantDefinitions,
                    ),
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
            <DialogContent className="max-w-3xl border-border bg-accent">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Edit Variant</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Variant name and SKU are generated from the brand, model, and selected attributes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        {/* Condition Select */}
                        <div className="space-y-2">
                            <Label className="text-foreground">Condition</Label>
                            <select
                                value={form.condition}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        condition: event.target.value,
                                    }))
                                }
                                /* Fixed: Added bg-background and text-foreground to prevent white background in dark mode */
                                className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20"
                            >
                                {(variantDefinitions?.conditions ?? []).map((condition) => (
                                    <option key={condition} value={condition} className="bg-background text-foreground">
                                        {condition}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.condition?.[0]} />
                        </div>

                        {/* Dynamic Attributes */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {visibleDefinitions.map((definition) => (
                                <div key={definition.key} className="space-y-2">
                                    <Label htmlFor={`variant-${definition.key}`} className="text-foreground">
                                        {definition.label}
                                    </Label>
                                    <Input
                                        id={`variant-${definition.key}`}
                                        className="bg-background border-input text-foreground focus-visible:ring-ring"
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

                        {/* Preview Section - Replaced slate with muted semantic colors */}
                        <div className="grid gap-4 rounded-lg border border-border bg-muted/30 px-4 py-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="variant-name-preview" className="text-muted-foreground text-xs uppercase font-bold tracking-tight">
                                    Variant Name Preview
                                </Label>
                                <Input
                                    id="variant-name-preview"
                                    className="bg-muted border-border text-muted-foreground cursor-not-allowed"
                                    value={namePreview}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="variant-sku-preview" className="text-muted-foreground text-xs uppercase font-bold tracking-tight">
                                    SKU Preview
                                </Label>
                                <Input
                                    id="variant-sku-preview"
                                    className="bg-muted border-border text-muted-foreground cursor-not-allowed"
                                    value={skuPreview}
                                    readOnly
                                    disabled
                                />
                                <InputError message={errors.sku?.[0]} />
                            </div>
                        </div>

                        <InputError message={errors.submit?.[0]} />
                    </DialogBody>

                    <DialogFooter className="border-t border-border pt-4">
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
