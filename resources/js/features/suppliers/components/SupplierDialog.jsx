import { buildSupplierFormData } from '@/features/suppliers/lib/supplierForm';
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

const statuses = ['Active', 'On-Hold', 'Blacklisted', 'Archived'];

export default function SupplierDialog({ open, onOpenChange, supplier = null }) {
    const isEditing = supplier !== null;
    const form = useForm(buildSupplierFormData(supplier));

    useEffect(() => {
        form.setData(buildSupplierFormData(supplier));
        form.clearErrors();
    }, [supplier]);

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
            form.put(route('suppliers.update', supplier.id), options);
            return;
        }

        form.post(route('suppliers.store'), options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Supplier' : 'Add Supplier'}
                    </DialogTitle>
                    <DialogDescription>
                        Manage supplier identity and primary contact details.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="legal-business-name">
                                    Legal Business Name
                                </Label>
                                <Input
                                    id="legal-business-name"
                                    value={form.data.legal_business_name}
                                    onChange={(event) =>
                                        form.setData('legal_business_name', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.legal_business_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="trade-name">Trade Name</Label>
                                <Input
                                    id="trade-name"
                                    value={form.data.trade_name}
                                    onChange={(event) =>
                                        form.setData('trade_name', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.trade_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="supplier-status">Status</Label>
                                <select
                                    id="supplier-status"
                                    value={form.data.status}
                                    onChange={(event) =>
                                        form.setData('status', event.target.value)
                                    }
                                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.status} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="supplier-address">Address</Label>
                                <textarea
                                    id="supplier-address"
                                    value={form.data.address}
                                    onChange={(event) =>
                                        form.setData('address', event.target.value)
                                    }
                                    className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                                <InputError message={form.errors.address} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="supplier-email">Email</Label>
                                <Input
                                    id="supplier-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData('email', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.email} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="supplier-mobile">Mobile</Label>
                                <Input
                                    id="supplier-mobile"
                                    value={form.data.mobile}
                                    onChange={(event) =>
                                        form.setData('mobile', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.mobile} />
                            </div>
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Supplier'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
