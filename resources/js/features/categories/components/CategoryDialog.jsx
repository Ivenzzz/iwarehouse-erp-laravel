import { buildCategoryFormData } from '@/features/categories/lib/categoryForm';
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
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function CategoryDialog({
    open,
    onOpenChange,
    category = null,
    topLevelCategories = [],
}) {
    const isEditing = category !== null;
    const form = useForm(buildCategoryFormData(category));

    useEffect(() => {
        form.setData(buildCategoryFormData(category));
        form.clearErrors();
    }, [category]);

    const close = () => {
        onOpenChange(false);
        form.reset();
        form.clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => close(),
        };

        if (isEditing) {
            form.put(route('categories.update', category.id), options);
            return;
        }

        form.post(route('categories.store'), options);
    };

    const parentOptions = topLevelCategories.filter(
        (parent) => parent.id !== category?.id,
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Category' : 'Add Category'}
                    </DialogTitle>
                    <DialogDescription>
                        Manage a product category or assign it under a top-level category.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Name</Label>
                            <Input
                                id="category-name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="parent-category">Parent Category</Label>
                            <select
                                id="parent-category"
                                value={form.data.parent_category_id}
                                onChange={(event) =>
                                    form.setData('parent_category_id', event.target.value)
                                }
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                                <option value="">None (top-level category)</option>
                                {parentOptions.map((parent) => (
                                    <option key={parent.id} value={parent.id}>
                                        {parent.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.parent_category_id} />
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
