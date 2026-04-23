import { buildUserFormData } from '@/features/users/lib/userForm';
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
import { Combobox } from '@/shared/components/ui/combobox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';

export default function UserDialog({
    open,
    onOpenChange,
    user = null,
    roles = [],
    employees = [],
    statuses = [],
}) {
    const isEditing = user !== null;
    const form = useForm(buildUserFormData(user));

    useEffect(() => {
        form.setData(buildUserFormData(user));
        form.clearErrors();
    }, [user]);

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
            form.put(route('settings.users.update', user.id), options);
            return;
        }

        form.post(route('settings.users.store'), options);
    };

    const toggleRole = (roleName) => {
        const nextRoles = form.data.roles.includes(roleName)
            ? form.data.roles.filter((name) => name !== roleName)
            : [...form.data.roles, roleName];

        form.setData('roles', nextRoles);
    };

    const statusOptions = useMemo(
        () => statuses.map((status) => ({ value: status, label: status })),
        [statuses],
    );

    const employeeOptions = useMemo(
        () => [
            { value: '', label: 'No linked employee' },
            ...employees
                .filter((employee) => !employee.linked_user_id || employee.linked_user_id === user?.id)
                .map((employee) => ({
                    value: String(employee.id),
                    label: `${employee.employee_id} - ${employee.full_name}${employee.department ? ` (${employee.department})` : ''}`,
                })),
        ],
        [employees, user?.id],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit User' : 'Add User'}</DialogTitle>
                    <DialogDescription>
                        Manage account details, role assignment, status, and employee link.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto">
                        <section className="grid gap-4 md:grid-cols-2">
                            <Field id="user-name" label="Name" value={form.data.name} error={form.errors.name} onChange={(value) => form.setData('name', value)} />
                            <Field id="user-username" label="Username" value={form.data.username} error={form.errors.username} onChange={(value) => form.setData('username', value)} />
                            <Field id="user-email" label="Email" type="email" value={form.data.email} error={form.errors.email} onChange={(value) => form.setData('email', value)} />

                            <div className="space-y-2">
                                <Label htmlFor="user-status">Status</Label>
                                <Combobox
                                    id="user-status"
                                    value={form.data.status}
                                    onValueChange={(nextValue) => form.setData('status', nextValue ?? '')}
                                    options={statusOptions}
                                    placeholder="Select status"
                                    searchPlaceholder="Search status..."
                                    emptyText="No statuses found."
                                    className="h-8 w-full border-input bg-background py-1 text-sm"
                                />
                                <InputError message={form.errors.status} />
                            </div>

                            {!isEditing ? (
                                <>
                                    <Field id="user-password" label="Password" type="password" value={form.data.password} error={form.errors.password} onChange={(value) => form.setData('password', value)} />
                                    <Field id="user-password-confirmation" label="Confirm Password" type="password" value={form.data.password_confirmation} error={form.errors.password_confirmation} onChange={(value) => form.setData('password_confirmation', value)} />
                                </>
                            ) : null}
                        </section>

                        <section className="space-y-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Roles</h3>
                                <p className="text-xs text-muted-foreground">Select one or more roles for this account.</p>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                {roles.map((role) => (
                                    <label key={role.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={form.data.roles.includes(role.name)}
                                            onChange={() => toggleRole(role.name)}
                                        />
                                        <span>{role.name}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError message={form.errors.roles || form.errors['roles.0']} />
                        </section>

                        <section className="space-y-2">
                            <Label htmlFor="employee-link">Linked Employee</Label>
                            <Combobox
                                id="employee-link"
                                value={form.data.employee_id}
                                onValueChange={(nextValue) => form.setData('employee_id', nextValue ?? '')}
                                options={employeeOptions}
                                placeholder="Select linked employee"
                                searchPlaceholder="Search employee..."
                                emptyText="No employees found."
                                className="h-8 w-full border-input bg-background py-1 text-sm"
                            />
                            <InputError message={form.errors.employee_id} />
                        </section>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Field({ id, label, value, onChange, error, type = 'text' }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
            <InputError message={error} />
        </div>
    );
}
