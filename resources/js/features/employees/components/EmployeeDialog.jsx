import { buildEmployeeFormData } from '@/features/employees/lib/employeeForm';
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

export default function EmployeeDialog({
    open,
    onOpenChange,
    employee = null,
}) {
    const isEditing = employee !== null;
    const form = useForm(buildEmployeeFormData(employee));

    useEffect(() => {
        form.setData(buildEmployeeFormData(employee));
        form.clearErrors();
    }, [employee]);

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
            form.put(route('employees.update', employee.id), options);
            return;
        }

        form.post(route('employees.store'), options);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
                    <DialogDescription>
                        Manage employee basic profile, department, and job title.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit}>
                    <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto">
                        <section className="grid gap-4 md:grid-cols-2">
                            <Field id="employee-code" label="Employee Code" value={form.data.employee_code} error={form.errors.employee_code} onChange={(value) => form.setData('employee_code', value)} />
                            <Field id="firstname" label="Firstname" value={form.data.firstname} error={form.errors.firstname} onChange={(value) => form.setData('firstname', value)} />
                            <Field id="lastname" label="Lastname" value={form.data.lastname} error={form.errors.lastname} onChange={(value) => form.setData('lastname', value)} />
                            <Field id="department-name" label="Department Name" value={form.data.department_name} error={form.errors.department_name} onChange={(value) => form.setData('department_name', value)} />
                            <Field id="job-title" label="JobTitle" value={form.data.job_title} error={form.errors.job_title} onChange={(value) => form.setData('job_title', value)} />
                        </section>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEditing ? 'Save Changes' : 'Create Employee'}
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
