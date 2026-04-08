import { buildWarehouseFormData } from '@/features/warehouses/lib/warehouseForm';
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

export default function WarehouseDialog({ open, onOpenChange, warehouse = null, warehouseTypes }) {
    const isEditing = warehouse !== null;
    const form = useForm(buildWarehouseFormData(warehouse));

    useEffect(() => {
        form.setData(buildWarehouseFormData(warehouse));
        form.clearErrors();
    }, [warehouse]);

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
            form.put(route('warehouses.update', warehouse.id), options);
            return;
        }

        form.post(route('warehouses.store'), options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
                    <DialogDescription>
                        Manage warehouse type, contact information, and address details.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="warehouse-name">Name</Label>
                                <Input id="warehouse-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                                <InputError message={form.errors.name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-type">Warehouse Type</Label>
                                <select
                                    id="warehouse-type"
                                    value={form.data.warehouse_type}
                                    onChange={(event) => form.setData('warehouse_type', event.target.value)}
                                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    {warehouseTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.warehouse_type} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-sort-order">Sort Order</Label>
                                <Input id="warehouse-sort-order" type="number" min="0" value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value)} />
                                <InputError message={form.errors.sort_order} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-phone">Phone Number</Label>
                                <Input id="warehouse-phone" value={form.data.phone_number} onChange={(event) => form.setData('phone_number', event.target.value)} />
                                <InputError message={form.errors.phone_number} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-email">Email</Label>
                                <Input id="warehouse-email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                                <InputError message={form.errors.email} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="warehouse-street">Street</Label>
                                <Input id="warehouse-street" value={form.data.street} onChange={(event) => form.setData('street', event.target.value)} />
                                <InputError message={form.errors.street} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-city">City</Label>
                                <Input id="warehouse-city" value={form.data.city} onChange={(event) => form.setData('city', event.target.value)} />
                                <InputError message={form.errors.city} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-province">Province</Label>
                                <Input id="warehouse-province" value={form.data.province} onChange={(event) => form.setData('province', event.target.value)} />
                                <InputError message={form.errors.province} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-zip-code">Zip Code</Label>
                                <Input id="warehouse-zip-code" value={form.data.zip_code} onChange={(event) => form.setData('zip_code', event.target.value)} />
                                <InputError message={form.errors.zip_code} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-country">Country</Label>
                                <Input id="warehouse-country" value={form.data.country} onChange={(event) => form.setData('country', event.target.value)} />
                                <InputError message={form.errors.country} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-latitude">Latitude</Label>
                                <Input id="warehouse-latitude" type="number" step="0.0000001" value={form.data.latitude} onChange={(event) => form.setData('latitude', event.target.value)} />
                                <InputError message={form.errors.latitude} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="warehouse-longitude">Longitude</Label>
                                <Input id="warehouse-longitude" type="number" step="0.0000001" value={form.data.longitude} onChange={(event) => form.setData('longitude', event.target.value)} />
                                <InputError message={form.errors.longitude} />
                            </div>
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Warehouse'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
