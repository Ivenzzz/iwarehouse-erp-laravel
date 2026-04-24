import ResetPasswordDialog from '@/features/users/components/ResetPasswordDialog';
import UserDialog from '@/features/users/components/UserDialog';
import UserProfileDialog from '@/features/users/components/UserProfileDialog';
import UsersTable from '@/features/users/components/UsersTable';
import { Button } from '@/shared/components/ui/button';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export default function UsersPage({
    users,
    roles,
    employees,
    statuses,
    filters,
}) {
    const { auth, errors } = usePage().props;
    const permissions = auth.permissions ?? [];
    const can = useMemo(
        () => (permission) => permissions.includes(permission),
        [permissions],
    );

    const [search, setSearch] = useState(filters.search ?? '');
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const fileInputRef = useRef(null);

    usePageToasts([...(Object.values(errors ?? {})), errors?.file], 'destructive');

    const visitUsers = (params) => {
        router.get(
            route('settings.users.index'),
            {
                search: params.search ?? filters.search,
                sort: params.sort ?? filters.sort,
                direction: params.direction ?? filters.direction,
                status: params.status ?? filters.status,
                role: params.role ?? filters.role,
                employee_link: params.employee_link ?? filters.employee_link,
                online: params.online ?? filters.online,
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
        setSelectedUser(null);
        setUserDialogOpen(true);
    };

    const openEdit = (user) => {
        setSelectedUser(user);
        setUserDialogOpen(true);
    };

    const openProfile = (user) => {
        setSelectedUser(user);
        setProfileDialogOpen(true);
    };

    const openResetPassword = (user) => {
        setSelectedUser(user);
        setResetDialogOpen(true);
    };

    const searchUsers = (event) => {
        event.preventDefault();
        visitUsers({ search: search.trim(), page: undefined });
    };

    const updateFilter = (field, value) => {
        visitUsers({ [field]: value, page: undefined });
    };

    const clearFilters = () => {
        setSearch('');
        visitUsers({
            search: '',
            status: '',
            role: '',
            employee_link: '',
            online: '',
            page: undefined,
        });
    };

    const sortUsers = (sort) => {
        const direction = filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc';
        visitUsers({ sort, direction, page: undefined });
    };

    const toggleStatus = (user) => {
        const nextStatus = user.status === 'active' ? 'inactive' : 'active';

        if (!window.confirm(`${nextStatus === 'inactive' ? 'Deactivate' : 'Activate'} ${user.name}?`)) {
            return;
        }

        router.patch(route('settings.users.status', user.id), { status: nextStatus }, { preserveScroll: true });
    };

    const unlinkEmployee = (user) => {
        if (!window.confirm(`Remove employee link from ${user.name}?`)) {
            return;
        }

        router.delete(route('settings.users.employee-account.destroy', user.id), { preserveScroll: true });
    };

    const deleteUser = (user) => {
        if (!window.confirm(`Delete ${user.name}?`)) {
            return;
        }

        router.delete(route('settings.users.destroy', user.id), { preserveScroll: true });
    };

    const handleImport = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        router.post(
            route('settings.users.import'),
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
        <AppShell title="Users">
            <Head title="Users" />

            <UserDialog
                open={userDialogOpen}
                onOpenChange={setUserDialogOpen}
                user={selectedUser}
                roles={roles}
                employees={employees}
                statuses={statuses}
            />
            <ResetPasswordDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                user={selectedUser}
            />
            <UserProfileDialog
                open={profileDialogOpen}
                onOpenChange={setProfileDialogOpen}
                user={selectedUser}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImport}
            />

            <div className="mx-auto flex w-full max-w-full flex-col gap-4">
                <section className="bg-card shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <div className="border-b border-border px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-semibold text-foreground">Users</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage account access, roles, employee links, password resets, and login monitoring.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {can('users.create') ? (
                                    <>
                                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                            <Upload className="size-4" />
                                            Import CSV
                                        </Button>
                                        <Button type="button" onClick={openCreate}>
                                            <Plus className="size-4" />
                                            Add User
                                        </Button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 px-5 py-5">
                        <section className="bg-card shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                            <div className="px-5 py-5">
                                <UsersTable
                                    users={users.data}
                                    pagination={{
                                        currentPage: users.current_page,
                                        from: users.from,
                                        lastPage: users.last_page,
                                        links: users.links,
                                        perPage: users.per_page,
                                        to: users.to,
                                        total: users.total,
                                    }}
                                    filters={filters}
                                    search={search}
                                    roles={roles}
                                    onSearchChange={setSearch}
                                    onFilterChange={updateFilter}
                                    onSearch={searchUsers}
                                    onClearFilters={clearFilters}
                                    onSort={sortUsers}
                                    onPageChange={(page) => visitUsers({ page })}
                                    onProfile={openProfile}
                                    onEdit={openEdit}
                                    onResetPassword={openResetPassword}
                                    onToggleStatus={toggleStatus}
                                    onUnlinkEmployee={unlinkEmployee}
                                    onDelete={deleteUser}
                                    can={can}
                                />
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
