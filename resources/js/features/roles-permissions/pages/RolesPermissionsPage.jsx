import InputError from '@/shared/components/feedback/InputError';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { usePageToasts } from '@/shared/hooks/use-page-toasts';
import AppShell from '@/shared/layouts/AppShell';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    KeyRound,
    Layers,
    Pencil,
    Plus,
    Search,
    Shield,
    Trash2,
    UserCheck,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const TAB_ROLES = 'roles';
const TAB_PERMISSIONS = 'permissions';
const TAB_ASSIGNMENTS = 'assignments';

const NAV_ITEMS = [
    {
        id: TAB_ROLES,
        label: 'Roles',
        icon: Shield,
        description: 'Create and manage roles',
    },
    {
        id: TAB_PERMISSIONS,
        label: 'Permission Matrix',
        icon: KeyRound,
        description: 'Assign permissions to roles',
    },
    {
        id: TAB_ASSIGNMENTS,
        label: 'User Assignments',
        icon: UserCheck,
        description: 'Assign roles to users',
    },
];

export default function RolesPermissionsPage({ roles = [], permissions = [], users = [], can = {} }) {
    const { errors } = usePage().props;

    const [activeTab, setActiveTab] = useState(TAB_ROLES);
    const [roleSearch, setRoleSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? null);
    const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? null);

    const initialSelectedRole = roles[0] ?? null;
    const initialSelectedUser = users[0] ?? null;

    const createRoleForm = useForm({ name: '' });
    const renameRoleForm = useForm({ name: '' });
    const permissionsForm = useForm({ permissions: initialSelectedRole?.permissions ?? [] });
    const userRolesForm = useForm({ roles: initialSelectedUser?.roles ?? [] });

    usePageToasts(Object.values(errors ?? {}), 'destructive');

    const filteredRoles = useMemo(() => {
        const needle = roleSearch.trim().toLowerCase();
        if (needle === '') return roles;
        return roles.filter((role) => role.name.toLowerCase().includes(needle));
    }, [roleSearch, roles]);

    const filteredUsers = useMemo(() => {
        const needle = userSearch.trim().toLowerCase();
        if (needle === '') return users;
        return users.filter((user) =>
            [user.name, user.username, user.email].some((field) =>
                String(field ?? '').toLowerCase().includes(needle),
            ),
        );
    }, [userSearch, users]);

    const selectedRole = roles.find((role) => role.id === Number(selectedRoleId)) ?? null;
    const selectedUser = users.find((user) => user.id === Number(selectedUserId)) ?? null;

    useEffect(() => {
        if (selectedRole) permissionsForm.setData('permissions', selectedRole.permissions ?? []);
    }, [selectedRole?.id, roles]);

    useEffect(() => {
        if (selectedUser) userRolesForm.setData('roles', selectedUser.roles ?? []);
    }, [selectedUser?.id, users]);

    const startEditRole = (role) => {
        setEditingRoleId(role.id);
        renameRoleForm.setData('name', role.name);
        renameRoleForm.clearErrors();
    };

    const cancelEditRole = () => {
        setEditingRoleId(null);
        renameRoleForm.reset();
        renameRoleForm.clearErrors();
    };

    const createRole = (event) => {
        event.preventDefault();
        createRoleForm.post(route('settings.roles-permissions.roles.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createRoleForm.reset();
                setActiveTab(TAB_ROLES);
            },
        });
    };

    const updateRole = (event, roleId) => {
        event.preventDefault();
        renameRoleForm.put(route('settings.roles-permissions.roles.update', roleId), {
            preserveScroll: true,
            onSuccess: () => cancelEditRole(),
        });
    };

    const deleteRole = (role) => {
        if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
        router.delete(route('settings.roles-permissions.roles.destroy', role.id), {
            preserveScroll: true,
        });
    };

    const loadRolePermissions = (roleId) => {
        const role = roles.find((item) => item.id === Number(roleId));
        setSelectedRoleId(roleId);
        permissionsForm.setData('permissions', role?.permissions ?? []);
        permissionsForm.clearErrors();
    };

    const togglePermission = (permissionName) => {
        const has = permissionsForm.data.permissions.includes(permissionName);
        permissionsForm.setData(
            'permissions',
            has
                ? permissionsForm.data.permissions.filter((p) => p !== permissionName)
                : [...permissionsForm.data.permissions, permissionName],
        );
    };

    const saveRolePermissions = (event) => {
        event.preventDefault();
        if (!selectedRole) return;
        permissionsForm.put(route('settings.roles-permissions.roles.permissions.sync', selectedRole.id), {
            preserveScroll: true,
        });
    };

    const loadUserRoles = (userId) => {
        const user = users.find((item) => item.id === Number(userId));
        setSelectedUserId(userId);
        userRolesForm.setData('roles', user?.roles ?? []);
        userRolesForm.clearErrors();
    };

    const toggleUserRole = (roleName) => {
        const has = userRolesForm.data.roles.includes(roleName);
        userRolesForm.setData(
            'roles',
            has
                ? userRolesForm.data.roles.filter((r) => r !== roleName)
                : [...userRolesForm.data.roles, roleName],
        );
    };

    const saveUserRoles = (event) => {
        event.preventDefault();
        if (!selectedUser) return;
        userRolesForm.put(route('settings.roles-permissions.users.roles.sync', selectedUser.id), {
            preserveScroll: true,
        });
    };

    const activeNav = NAV_ITEMS.find((n) => n.id === activeTab);

    return (
        <AppShell title="Roles and Permissions">
            <Head title="Roles and Permissions" />

            <div className="mx-auto w-full max-w-full">
                {/* Page header */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold leading-none tracking-tight text-foreground">
                            Roles &amp; Permissions
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage access control for your application.
                        </p>
                    </div>
                </div>

                {/* Shell */}
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex min-h-[520px] divide-x divide-border">

                        {/* ── Sidebar nav ── */}
                        <nav className="flex w-52 shrink-0 flex-col gap-0.5 bg-muted/30 p-2">
                            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveTab(id)}
                                    className={[
                                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                                        activeTab === id
                                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                                            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                                    ].join(' ')}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {label}
                                </button>
                            ))}
                        </nav>

                        {/* ── Content ── */}
                        <div className="flex min-w-0 flex-1 flex-col">
                            {/* Content header */}
                            <div className="border-b border-border px-6 py-4">
                                <p className="text-sm font-medium text-foreground">{activeNav?.label}</p>
                                <p className="text-xs text-muted-foreground">{activeNav?.description}</p>
                            </div>

                            <div className="flex-1 p-6">
                                {/* ══ ROLES TAB ══ */}
                                {activeTab === TAB_ROLES && (
                                    <div className="space-y-5">
                                        {can.create && (
                                            <form onSubmit={createRole} className="max-w-sm space-y-1.5">
                                                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    New Role
                                                </label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={createRoleForm.data.name}
                                                        onChange={(e) => createRoleForm.setData('name', e.target.value)}
                                                        placeholder="e.g. editor, viewer…"
                                                        className="h-8 text-sm"
                                                    />
                                                    <Button type="submit" size="sm" disabled={createRoleForm.processing} className="h-8 gap-1.5">
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Create
                                                    </Button>
                                                </div>
                                                <InputError message={createRoleForm.errors.name} />
                                            </form>
                                        )}

                                        {/* Search */}
                                        <div className="relative max-w-xs">
                                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                value={roleSearch}
                                                onChange={(e) => setRoleSearch(e.target.value)}
                                                placeholder="Search roles…"
                                                className="h-8 pl-8 text-sm"
                                            />
                                        </div>

                                        {/* Table */}
                                        <div className="overflow-hidden rounded-lg border border-border">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border bg-muted/40">
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                            Role
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                            Users
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                            Permissions
                                                        </th>
                                                        <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {filteredRoles.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                                No roles found.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {filteredRoles.map((role) => (
                                                        <tr key={role.id} className="group bg-card transition-colors hover:bg-muted/30">
                                                            <td className="px-4 py-3">
                                                                {editingRoleId === role.id ? (
                                                                    <form
                                                                        onSubmit={(e) => updateRole(e, role.id)}
                                                                        className="flex items-center gap-2"
                                                                    >
                                                                        <Input
                                                                            value={renameRoleForm.data.name}
                                                                            onChange={(e) => renameRoleForm.setData('name', e.target.value)}
                                                                            className="h-7 w-40 text-sm"
                                                                            autoFocus
                                                                        />
                                                                        <Button
                                                                            size="sm"
                                                                            type="submit"
                                                                            className="h-7 px-2 text-xs"
                                                                            disabled={renameRoleForm.processing || !can.update}
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={cancelEditRole}
                                                                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <InputError message={renameRoleForm.errors.name || renameRoleForm.errors.role} />
                                                                    </form>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-foreground">{role.name}</span>
                                                                        {role.is_protected && (
                                                                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                                                                                Protected
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <CountBadge>{role.users_count}</CountBadge>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <CountBadge>{role.permissions.length}</CountBadge>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                                    {can.update && !role.is_protected && editingRoleId !== role.id && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => startEditRole(role)}
                                                                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                                                                            title="Rename"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                    {can.delete && !role.is_protected && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => deleteRole(role)}
                                                                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 bg-background text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-red-900/40 dark:hover:bg-red-950/40"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'} found
                                        </p>
                                    </div>
                                )}

                                {/* ══ PERMISSIONS TAB ══ */}
                                {activeTab === TAB_PERMISSIONS && (
                                    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                                        {/* Role list */}
                                        <div className="space-y-1">
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                Select Role
                                            </p>
                                            <div className="overflow-hidden rounded-lg border border-border">
                                                {roles.map((role) => (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => loadRolePermissions(role.id)}
                                                        className={[
                                                            'flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 transition-colors',
                                                            selectedRoleId === role.id
                                                                ? 'bg-foreground/5 font-medium text-foreground'
                                                                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                                                        ].join(' ')}
                                                    >
                                                        <span>{role.name}</span>
                                                        {role.is_protected && (
                                                            <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">●</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedRole?.is_protected && (
                                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                                                    Protected role — permission edits are disabled.
                                                </p>
                                            )}
                                        </div>

                                        {/* Permission matrix */}
                                        <form onSubmit={saveRolePermissions} className="space-y-5">
                                            {!selectedRole && (
                                                <p className="text-sm text-muted-foreground">Select a role to manage permissions.</p>
                                            )}

                                            {selectedRole && permissions.map((group) => (
                                                <div key={group.group}>
                                                    <div className="mb-2 flex items-center gap-2">
                                                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                                                            {group.group}
                                                        </span>
                                                        <div className="h-px flex-1 bg-border" />
                                                        <span className="text-xs text-muted-foreground">
                                                            {group.items.filter((p) => permissionsForm.data.permissions.includes(p)).length}
                                                            /{group.items.length}
                                                        </span>
                                                    </div>
                                                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                                                        {group.items.map((permissionName) => {
                                                            const checked = permissionsForm.data.permissions.includes(permissionName);
                                                            const disabled = !can.update || selectedRole?.is_protected;
                                                            return (
                                                                <label
                                                                    key={permissionName}
                                                                    className={[
                                                                        'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors',
                                                                        checked
                                                                            ? 'border-foreground/20 bg-foreground/5 text-foreground'
                                                                            : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                                                                        disabled ? 'cursor-not-allowed opacity-50' : '',
                                                                    ].join(' ')}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        disabled={disabled}
                                                                        onChange={() => togglePermission(permissionName)}
                                                                        className="h-3.5 w-3.5 accent-foreground"
                                                                    />
                                                                    <span className="truncate font-mono text-xs">{permissionName}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}

                                            {selectedRole && (
                                                <div className="flex items-center gap-3 pt-1">
                                                    <InputError message={permissionsForm.errors.permissions || permissionsForm.errors.role} />
                                                    {can.update && (
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                            disabled={permissionsForm.processing || selectedRole?.is_protected}
                                                        >
                                                            Save Permissions
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </form>
                                    </div>
                                )}

                                {/* ══ ASSIGNMENTS TAB ══ */}
                                {activeTab === TAB_ASSIGNMENTS && (
                                    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                                        {/* User list */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                Select User
                                            </p>
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    value={userSearch}
                                                    onChange={(e) => setUserSearch(e.target.value)}
                                                    placeholder="Search users…"
                                                    className="h-8 pl-8 text-sm"
                                                />
                                            </div>
                                            <div className="overflow-hidden rounded-lg border border-border">
                                                {filteredUsers.length === 0 && (
                                                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">No users found.</p>
                                                )}
                                                {filteredUsers.map((user) => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => loadUserRoles(user.id)}
                                                        className={[
                                                            'flex w-full flex-col border-b border-border px-3 py-2.5 text-left last:border-b-0 transition-colors',
                                                            selectedUserId === user.id
                                                                ? 'bg-foreground/5'
                                                                : 'hover:bg-muted/40',
                                                        ].join(' ')}
                                                    >
                                                        <span className={[
                                                            'truncate text-sm font-medium',
                                                            selectedUserId === user.id ? 'text-foreground' : 'text-muted-foreground',
                                                        ].join(' ')}>
                                                            {user.name}
                                                        </span>
                                                        <span className="truncate text-xs text-muted-foreground">
                                                            @{user.username}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedUser && (
                                                <p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
                                            )}
                                        </div>

                                        {/* Role assignment */}
                                        <form onSubmit={saveUserRoles} className="space-y-4">
                                            {!selectedUser ? (
                                                <p className="text-sm text-muted-foreground">Select a user to manage their roles.</p>
                                            ) : (
                                                <>
                                                    <div>
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                                                                Roles for {selectedUser.name}
                                                            </p>
                                                            <div className="h-px flex-1 bg-border" />
                                                            <span className="text-xs text-muted-foreground">
                                                                {userRolesForm.data.roles.length} assigned
                                                            </span>
                                                        </div>
                                                        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                                                            {roles.map((role) => {
                                                                const checked = userRolesForm.data.roles.includes(role.name);
                                                                return (
                                                                    <label
                                                                        key={role.id}
                                                                        className={[
                                                                            'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors',
                                                                            checked
                                                                                ? 'border-foreground/20 bg-foreground/5 text-foreground'
                                                                                : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                                                                            !can.assign ? 'cursor-not-allowed opacity-50' : '',
                                                                        ].join(' ')}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            disabled={!can.assign}
                                                                            onChange={() => toggleUserRole(role.name)}
                                                                            className="h-3.5 w-3.5 accent-foreground"
                                                                        />
                                                                        <div className="min-w-0">
                                                                            <span className="block truncate font-medium">{role.name}</span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {role.permissions.length} permissions
                                                                            </span>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <InputError message={userRolesForm.errors.roles || userRolesForm.errors.user} />
                                                        {can.assign && (
                                                            <Button
                                                                type="submit"
                                                                size="sm"
                                                                disabled={userRolesForm.processing || !selectedUser}
                                                            >
                                                                Save Assignments
                                                            </Button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

function CountBadge({ children }) {
    return (
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
            {children}
        </span>
    );
}