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
import { useEffect } from 'react';

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
    const selectedBrand = brands.find((brand) => String(brand.id) === String(form.data.brand_id));
    const brandOptions = brands.map((brand) => ({
        value: brand.id,
        label: brand.name,
    }));
    const modelOptions = (selectedBrand?.models ?? []).map((model) => ({
        value: model.id,
        label: model.model_name,
    }));
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
    }, [productMaster, specDefinitions]);

    const close = () => {
        onOpenChange(false);
        form.reset();
        form.clearErrors();
    };

    const updateBrand = (brandId) => {
        form.setData({
            ...form.data,
            brand_id: brandId,
            model_id: '',
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
            <DialogContent className="max-w-3xl overflow-y-auto p-1">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Product Master' : 'Add Product Master'}
                    </DialogTitle>
                    <DialogDescription>
                        Select existing brand, model, and subcategory records. The master
                        SKU is generated automatically.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <section className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="product-master-brand">Brand</Label>
                                <Combobox
                                    id="product-master-brand"
                                    value={form.data.brand_id}
                                    onChange={(brandId) => updateBrand(brandId)}
                                    options={brandOptions}
                                    placeholder="Select brand"
                                    searchPlaceholder="Search brands..."
                                    emptyText="No brands found"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="product-master-model">Model</Label>
                                <Combobox
                                    id="product-master-model"
                                    value={form.data.model_id}
                                    onChange={(modelId) => form.setData('model_id', modelId)}
                                    options={modelOptions}
                                    placeholder={
                                        selectedBrand ? 'Select model' : 'Select brand first'
                                    }
                                    searchPlaceholder="Search models..."
                                    emptyText="No models found"
                                    disabled={!selectedBrand}
                                />
                                <InputError message={form.errors.model_id} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="product-master-subcategory">Subcategory</Label>
                                <Combobox
                                    id="product-master-subcategory"
                                    value={form.data.subcategory_id}
                                    onChange={(subcategoryId) =>
                                        form.setData('subcategory_id', subcategoryId)
                                    }
                                    options={subcategoryOptions}
                                    placeholder="Select subcategory"
                                    searchPlaceholder="Search categories or subcategories..."
                                    emptyText="No subcategories found"
                                />
                                <InputError message={form.errors.subcategory_id} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="product-master-description">Description</Label>
                                <textarea
                                    id="product-master-description"
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData('description', event.target.value)
                                    }
                                    className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                                <InputError message={form.errors.description} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="product-master-image">Product Image</Label>
                                <Input
                                    id="product-master-image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
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
                                    <div className="flex items-center gap-3 border bg-slate-50 px-3 py-3">
                                        <img
                                            src={productMaster.image_url}
                                            alt={productMaster.product_name}
                                            className="size-16 object-cover"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                form.setData({
                                                    ...form.data,
                                                    image: null,
                                                    clear_image: true,
                                                })
                                            }
                                        >
                                            <ImageOff className="size-4" />
                                            Clear Image
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="space-y-5">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Technical Specifications
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Optional normalized specification values.
                                </p>
                            </div>

                            {specDefinitions.map((group) => (
                                <div key={group.group} className="space-y-3 border px-4 py-4">
                                    <h4 className="text-sm font-semibold text-slate-700">
                                        {group.group}
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.definitions.map((definition) => (
                                            <div key={definition.key} className="space-y-2">
                                                <Label htmlFor={`spec-${definition.key}`}>
                                                    {definition.label}
                                                </Label>
                                                <Input
                                                    id={`spec-${definition.key}`}
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

                    <DialogFooter>
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
