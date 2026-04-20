import { buildProductMasterFormData } from '@/features/product-masters/lib/productMasterForm';
import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import { Combobox } from '@/shared/components/ui/combobox';
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
import { useForm } from '@inertiajs/react';
import { ImageOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const NEW_BRAND_PREFIX = '__new_brand__:';
const NEW_MODEL_PREFIX = '__new_model__:';

const normalizeName = (value) => String(value ?? '').trim().toLowerCase();

export default function ProductMasterDialog({
    open,
    onOpenChange,
    productMaster = null,
    brands = [],
    categories = [],
    specDefinitions = [],
}) {
    const isEditing = productMaster !== null;
    const form = useForm(buildProductMasterFormData(productMaster, specDefinitions));
    const [brandSearch, setBrandSearch] = useState('');
    const [modelSearch, setModelSearch] = useState('');
    const selectedBrand = brands.find(
        (brand) => String(brand.id) === String(form.data.brand_id),
    );
    const brandOptionsBase = brands.map((brand) => ({
        value: brand.id,
        label: brand.name,
    }));
    const modelOptionsBase = (selectedBrand?.models ?? []).map((model) => ({
        value: model.id,
        label: model.model_name,
    }));
    const normalizedBrandSearch = useMemo(() => normalizeName(brandSearch), [brandSearch]);
    const normalizedModelSearch = useMemo(() => normalizeName(modelSearch), [modelSearch]);
    const hasBrandContext = Boolean(form.data.brand_id || form.data.new_brand_name);
    const hasBrandDuplicate = useMemo(
        () =>
            normalizedBrandSearch !== '' &&
            brands.some((brand) => normalizeName(brand.name) === normalizedBrandSearch),
        [brands, normalizedBrandSearch],
    );
    const canAddBrand = normalizedBrandSearch !== '' && !hasBrandDuplicate;
    const currentBrandModels = selectedBrand?.models ?? [];
    const hasModelDuplicate = useMemo(
        () =>
            normalizedModelSearch !== '' &&
            currentBrandModels.some(
                (model) => normalizeName(model.model_name) === normalizedModelSearch,
            ),
        [currentBrandModels, normalizedModelSearch],
    );
    const canAddModel = hasBrandContext && normalizedModelSearch !== '' && !hasModelDuplicate;
    const brandOptions = useMemo(() => {
        if (!canAddBrand) {
            return brandOptionsBase;
        }

        return [
            {
                value: `${NEW_BRAND_PREFIX}${brandSearch.trim()}`,
                label: `Add "${brandSearch.trim()}"`,
                description: 'Create new brand',
                searchText: brandSearch.trim(),
            },
            ...brandOptionsBase,
        ];
    }, [brandOptionsBase, brandSearch, canAddBrand]);
    const modelOptions = useMemo(() => {
        if (!canAddModel) {
            return modelOptionsBase;
        }

        return [
            {
                value: `${NEW_MODEL_PREFIX}${modelSearch.trim()}`,
                label: `Add "${modelSearch.trim()}"`,
                description: 'Create new model',
                searchText: modelSearch.trim(),
            },
            ...modelOptionsBase,
        ];
    }, [canAddModel, modelOptionsBase, modelSearch]);
    const selectedBrandOption = useMemo(() => {
        if (form.data.brand_id) {
            return brandOptionsBase.find(
                (option) => String(option.value) === String(form.data.brand_id),
            );
        }

        if (form.data.new_brand_name) {
            return {
                value: `${NEW_BRAND_PREFIX}${form.data.new_brand_name}`,
                label: form.data.new_brand_name,
            };
        }

        return null;
    }, [brandOptionsBase, form.data.brand_id, form.data.new_brand_name]);
    const selectedModelOption = useMemo(() => {
        if (form.data.model_id) {
            return modelOptionsBase.find(
                (option) => String(option.value) === String(form.data.model_id),
            );
        }

        if (form.data.new_model_name) {
            return {
                value: `${NEW_MODEL_PREFIX}${form.data.new_model_name}`,
                label: form.data.new_model_name,
            };
        }

        return null;
    }, [form.data.model_id, form.data.new_model_name, modelOptionsBase]);
    const subcategoryOptions = categories.flatMap((category) =>
        category.children.map((subcategory) => ({
            value: subcategory.id,
            label: subcategory.name,
            group: category.name,
            description: category.name,
            searchText: `${category.name} ${subcategory.name}`,
        })),
    );

    useEffect(() => {
        form.setData(buildProductMasterFormData(productMaster, specDefinitions));
        form.clearErrors();
        setBrandSearch('');
        setModelSearch('');
    }, [productMaster, specDefinitions]);

    const close = () => {
        onOpenChange(false);
        form.reset();
        form.clearErrors();
        setBrandSearch('');
        setModelSearch('');
    };

    const updateBrand = (brandValue) => {
        if (String(brandValue).startsWith(NEW_BRAND_PREFIX)) {
            const newBrandName = String(brandValue).slice(NEW_BRAND_PREFIX.length).trim();

            form.setData({
                ...form.data,
                brand_id: '',
                model_id: '',
                new_brand_name: newBrandName,
                new_model_name: '',
            });
            return;
        }

        form.setData({
            ...form.data,
            brand_id: brandValue,
            model_id: '',
            new_brand_name: '',
            new_model_name: '',
        });
    };

    const updateModel = (modelValue) => {
        if (String(modelValue).startsWith(NEW_MODEL_PREFIX)) {
            const newModelName = String(modelValue).slice(NEW_MODEL_PREFIX.length).trim();

            form.setData({
                ...form.data,
                model_id: '',
                new_model_name: newModelName,
            });
            return;
        }

        form.setData({
            ...form.data,
            model_id: modelValue,
            new_model_name: '',
        });
    };

    const updateSpec = (key, value) => {
        form.setData('specs', {
            ...form.data.specs,
            [key]: value,
        });
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => close(),
        };

        if (isEditing) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(route('product-masters.update', productMaster.id), options);
            return;
        }

        form.transform((data) => data);
        form.post(route('product-masters.store'), options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Changed bg-background to bg-accent */}
            <DialogContent className="flex max-h-[95vh] max-w-4xl flex-col p-0 border-border bg-accent">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-accent-foreground">
                        {isEditing ? 'Edit Product Master' : 'Add Product Master'}
                    </DialogTitle>
                    <DialogDescription className="text-accent-foreground/70">
                        Select existing brand/model or add missing entries inline. The master SKU
                        is generated automatically.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
                    {/* Scrollable area */}
                    <DialogBody className="flex-1 overflow-y-auto p-6 pt-2 space-y-8">
                        <section className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="product-master-brand" className="text-accent-foreground">Brand</Label>
                                <Combobox
                                    id="product-master-brand"
                                    value={form.data.brand_id}
                                    onChange={(brandId) => updateBrand(brandId)}
                                    options={brandOptions}
                                    onInputValueChange={setBrandSearch}
                                    selectedOption={selectedBrandOption}
                                />
                                <InputError
                                    message={
                                        hasBrandDuplicate && normalizedBrandSearch !== ''
                                            ? 'Brand already exists.'
                                            : form.errors.new_brand_name ?? form.errors.brand_id
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="product-master-model" className="text-accent-foreground">Model</Label>
                                <Combobox
                                    id="product-master-model"
                                    value={form.data.model_id}
                                    onChange={(modelId) => updateModel(modelId)}
                                    options={modelOptions}
                                    disabled={!hasBrandContext}
                                    onInputValueChange={setModelSearch}
                                    selectedOption={selectedModelOption}
                                />
                                <InputError
                                    message={
                                        hasModelDuplicate && normalizedModelSearch !== ''
                                            ? 'Model already exists for this brand.'
                                            : form.errors.new_model_name ?? form.errors.model_id
                                    }
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="product-master-subcategory" className="text-accent-foreground">Subcategory</Label>
                                <Combobox
                                    id="product-master-subcategory"
                                    value={form.data.subcategory_id}
                                    onChange={(subcategoryId) =>
                                        form.setData('subcategory_id', subcategoryId)
                                    }
                                    options={subcategoryOptions}
                                />
                                <InputError message={form.errors.subcategory_id} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="product-master-description" className="text-accent-foreground">Description</Label>
                                <textarea
                                    id="product-master-description"
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData('description', event.target.value)
                                    }
                                    className="min-h-24 w-full rounded-md border border-input bg-accent px-3 py-2 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                                />
                                <InputError message={form.errors.description} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="product-master-image" className="text-accent-foreground">Product Image</Label>
                                <Input
                                    id="product-master-image"
                                    type="file"
                                    className="bg-background border-input text-foreground"
                                    onChange={(event) =>
                                        form.setData({
                                            ...form.data,
                                            image: event.target.files?.[0] ?? null,
                                            clear_image: false,
                                        })
                                    }
                                />
                                <InputError message={form.errors.image} />

                                {productMaster?.image_url && !form.data.clear_image && (
                                    <div className="flex items-center gap-4 rounded-md border border-border bg-background/50 p-3">
                                        <div className="overflow-hidden rounded border border-border bg-background">
                                            <img
                                                src={productMaster.image_url}
                                                alt={productMaster.product_name}
                                                className="size-16 object-cover"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                                form.setData({ ...form.data, image: null, clear_image: true })
                                            }
                                        >
                                            <ImageOff className="mr-2 size-4" />
                                            Clear Image
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-6 pt-4">
                            <div className="border-b border-border/50 pb-2">
                                <h3 className="text-sm font-bold text-accent-foreground">
                                    Technical Specifications
                                </h3>
                                <p className="text-xs text-accent-foreground/60">
                                    Optional normalized specification values.
                                </p>
                            </div>

                            {specDefinitions.map((group) => (
                                /* Specification cards now use bg-background to contrast against the bg-accent dialog */
                                <div key={group.group} className="space-y-4 rounded-lg border border-border bg-background p-4 shadow-sm">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {group.group}
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.definitions.map((definition) => (
                                            <div key={definition.key} className="space-y-2">
                                                <Label htmlFor={`spec-${definition.key}`} className="text-xs text-foreground">
                                                    {definition.label}
                                                </Label>
                                                <Input
                                                    id={`spec-${definition.key}`}
                                                    /* Fixed: Changed bg to bg-background and ensured text-foreground */
                                                    className="h-9 border-input bg-background text-foreground focus-visible:ring-ring placeholder:text-muted-foreground"
                                                    value={form.data.specs[definition.key] ?? ''}
                                                    onChange={(event) =>
                                                        updateSpec(definition.key, event.target.value)
                                                    }
                                                />
                                                <InputError
                                                    message={form.errors[`specs.${definition.key}`]}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    </DialogBody>

                    <DialogFooter className="p-6 border-t border-border/50 bg-accent">
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Product Master'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
