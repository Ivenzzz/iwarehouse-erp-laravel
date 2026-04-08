import { buildPaymentMethodFormData, formatPaymentMethodType } from '@/features/payment-methods/lib/paymentMethodForm';
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

export default function PaymentMethodDialog({
    open,
    onOpenChange,
    paymentMethod = null,
    paymentMethodTypes = [],
}) {
    const isEditing = paymentMethod !== null;
    const form = useForm(buildPaymentMethodFormData(paymentMethod));

    useEffect(() => {
        form.setData(buildPaymentMethodFormData(paymentMethod));
        form.clearErrors();
    }, [paymentMethod]);

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
            form.put(route('payment-methods.update', paymentMethod.id), options);
            return;
        }

        form.post(route('payment-methods.store'), options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Payment Method' : 'Add Payment Method'}
                    </DialogTitle>
                    <DialogDescription>
                        Manage a payment method and its type classification.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="payment-method-name">Name</Label>
                            <Input
                                id="payment-method-name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-method-type">Type</Label>
                            <select
                                id="payment-method-type"
                                value={form.data.type}
                                onChange={(event) => form.setData('type', event.target.value)}
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                                {paymentMethodTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {formatPaymentMethodType(type)}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.type} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-method-logo">Logo URL or Path</Label>
                            <Input
                                id="payment-method-logo"
                                value={form.data.logo}
                                onChange={(event) => form.setData('logo', event.target.value)}
                            />
                            <InputError message={form.errors.logo} />
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Payment Method'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
