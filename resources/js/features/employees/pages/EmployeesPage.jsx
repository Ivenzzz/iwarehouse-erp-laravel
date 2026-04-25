import EmployeeDialog from '@/features/employees/components/EmployeeDialog';
import EmployeesHeader from '@/features/employees/components/EmployeesHeader';
import EmployeesTable from '@/features/employees/components/EmployeesTable';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function EmployeesPage({ employees, filters }) {
    const { errors } = usePage().props;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const fileInputRef = useRef(null);

    usePageToasts([errors?.file, errors?.employee], 'destructive');

    const visitEmployees = (params) => {
        router.get(
            route('employees.index'),
            {
                search: params.search ?? filters.search,
                sort: params.sort ?? filters.sort,
                direction: params.direction ?? filters.direction,
                page: params.page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openCreate = () => {
        setEditingEmployee(null);
        setDialogOpen(true);
    };

    const openEdit = (employee) => {
        setEditingEmployee(employee);
        setDialogOpen(true);
    };

    const deleteEmployee = (employee) => {
        if (!window.confirm(`Delete ${employee.full_name}?`)) {
            return;
        }

        router.delete(route('employees.destroy', employee.id), {
            preserveScroll: true,
        });
    };

    const searchEmployees = (event) => {
        event.preventDefault();
        visitEmployees({
            search: search.trim(),
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visitEmployees({
            search: '',
            page: undefined,
        });
    };

    const sortEmployees = (sort) => {
        const direction =
            filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';

        visitEmployees({
            sort,
            direction,
            page: undefined,
        });
    };

    const goToPage = (page) => {
        visitEmployees({ page });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('employees.import'),
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    event.target.value = '';
                },
            },
        );
    };

    return (
        <AppShell title="Employees">
            <Head title="Employees" />

            <EmployeeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                employee={editingEmployee}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex max-w-full flex-col gap-5">
                <section className="bg-background">
                    <EmployeesHeader onImport={() => fileInputRef.current?.click()} onCreate={openCreate} />

                    <div className="space-y-5">
                        <section className="bg-accent">
                            <div className="px-5 py-5">
                                <EmployeesTable
                                    employees={employees.data}
                                    pagination={{
                                        currentPage: employees.current_page,
                                        from: employees.from,
                                        lastPage: employees.last_page,
                                        links: employees.links,
                                        perPage: employees.per_page,
                                        to: employees.to,
                                        total: employees.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    onSearchChange={setSearch}
                                    onSearch={searchEmployees}
                                    onClearSearch={clearSearch}
                                    onSort={sortEmployees}
                                    onPageChange={goToPage}
                                    onEdit={openEdit}
                                    onDelete={deleteEmployee}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
