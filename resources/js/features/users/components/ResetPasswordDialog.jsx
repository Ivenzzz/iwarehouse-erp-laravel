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

export default function ResetPasswordDialog({ open, onOpenChange, user = null }) {
    const form = useForm({
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        form.reset();
        form.clearErrors();
    }, [user]);

    const close = () => {
        onOpenChange(false);
        form.reset();
        form.clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();

        if (!user) {
            return;
        }

        form.patch(route('settings.users.password', user.id), {
            preserveScroll: true,
            onSuccess: () => close(),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                        Set a new password for {user?.name ?? 'this user'}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-password">New Password</Label>
                            <Input id="reset-password" type="password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                            <InputError message={form.errors.password} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reset-password-confirmation">Confirm Password</Label>
                            <Input id="reset-password-confirmation" type="password" value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                            <InputError message={form.errors.password_confirmation} />
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>Reset Password</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
