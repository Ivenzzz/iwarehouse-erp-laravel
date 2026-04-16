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
            <DialogContent className="border-border bg-background">
                <DialogHeader>
                    <DialogTitle className="text-foreground">
                        {isEditing ? 'Edit Category' : 'Add Category'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Manage a product category or assign it under a top-level category.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        {/* Name Input */}
                        <div className="space-y-2">
                            <Label htmlFor="category-name" className="text-foreground">
                                Name
                            </Label>
                            <Input
                                id="category-name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                className="bg-background text-foreground border-input focus:ring-ring"
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        {/* Parent Category Select */}
                        <div className="space-y-2">
                            <Label htmlFor="parent-category" className="text-foreground">
                                Parent Category
                            </Label>
                            <select
                                id="parent-category"
                                value={form.data.parent_category_id}
                                onChange={(event) =>
                                    form.setData('parent_category_id', event.target.value)
                                }
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="" className="bg-background text-foreground">
                                    None (top-level category)
                                </option>
                                {parentOptions.map((parent) => (
                                    <option
                                        key={parent.id}
                                        value={parent.id}
                                        className="bg-background text-foreground"
                                    >
                                        {parent.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.parent_category_id} />
                        </div>
                    </DialogBody>

                    <DialogFooter className="bg-secondary/30">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={close}
                            className="border-border text-foreground hover:bg-accent"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isEditing ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}