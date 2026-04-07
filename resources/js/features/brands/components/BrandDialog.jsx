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
import { buildFormData, emptyModelRow } from '@/features/brands/lib/brandForm';
import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function BrandDialog({ open, onOpenChange, brand = null }) {
    const isEditing = brand !== null;
    const form = useForm(buildFormData(brand));
    const modelInputRefs = useRef([]);
    const pendingModelFocusIndex = useRef(null);

    useEffect(() => {
        form.setData(buildFormData(brand));
        form.clearErrors();
    }, [brand]);

    useEffect(() => {
        if (pendingModelFocusIndex.current === null) {
            return;
        }

        modelInputRefs.current[pendingModelFocusIndex.current]?.focus();
        pendingModelFocusIndex.current = null;
    }, [form.data.models.length]);

    const close = () => {
        onOpenChange(false);
        form.reset();
        form.clearErrors();
    };

    const updateModel = (index, value) => {
        form.setData(
            'models',
            form.data.models.map((row, rowIndex) =>
                rowIndex === index ? { ...row, model_name: value } : row,
            ),
        );
    };

    const addModelRow = () => {
        form.setData('models', [...form.data.models, emptyModelRow()]);
    };

    const insertModelRowAfter = (index) => {
        const nextIndex = index + 1;

        pendingModelFocusIndex.current = nextIndex;
        form.setData('models', [
            ...form.data.models.slice(0, nextIndex),
            emptyModelRow(),
            ...form.data.models.slice(nextIndex),
        ]);
    };

    const removeModelRow = (index) => {
        form.setData(
            'models',
            form.data.models.filter((_, rowIndex) => rowIndex !== index),
        );
    };

    const handleModelKeyDown = (event, index) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        if (form.data.models[index].model_name.trim() === '') {
            return;
        }

        insertModelRowAfter(index);
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => close(),
        };

        if (isEditing) {
            form.put(route('brands.update', brand.id), options);
            return;
        }

        form.post(route('brands.store'), options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
                    <DialogDescription>
                        Manage a brand and its associated product models.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="brand-name">Brand Name</Label>
                            <Input
                                id="brand-name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Associated Models
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Add, update, or remove model names for this brand.
                                    </p>
                                </div>

                                <Button type="button" variant="outline" onClick={addModelRow}>
                                    <Plus className="size-4" />
                                    Add Model
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {form.data.models.map((model, index) => (
                                    <div
                                        key={`${model.id ?? 'new'}-${index}`}
                                        className="grid gap-3 border px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto]"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor={`model-${index}`}>Model Name</Label>
                                            <Input
                                                id={`model-${index}`}
                                                ref={(element) => {
                                                    modelInputRefs.current[index] = element;
                                                }}
                                                value={model.model_name}
                                                onChange={(event) =>
                                                    updateModel(index, event.target.value)
                                                }
                                                onKeyDown={(event) =>
                                                    handleModelKeyDown(event, index)
                                                }
                                            />
                                            <InputError
                                                message={form.errors[`models.${index}.model_name`]}
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => removeModelRow(index)}
                                                disabled={form.data.models.length === 1}
                                            >
                                                <Trash2 className="size-4" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <InputError message={form.errors.models} />
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Brand'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
