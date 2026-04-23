import { Button } from '@/shared/components/ui/button';
import { Combobox } from '@/shared/components/ui/combobox';
import { ArrowDown, ArrowUp, Eye, KeyRound, Pencil, Power, Rows3, Search, Trash2, Unlink, X } from 'lucide-react';
import { Children } from 'react';

export default function UsersTable({
    users,
    pagination,
    filters,
    search,
    roles,
    onSearchChange,
    onFilterChange,
    onSearch,
    onClearFilters,
    onSort,
    onPageChange,
    onProfile,
    onEdit,
    onResetPassword,
    onToggleStatus,
    onUnlinkEmployee,
    onDelete,
    can,
}) {
    const hasFilters = Boolean(filters.search || filters.status || filters.role || filters.employee_link || filters.online);

    const sortIcon = (sort) => {
        if (filters.sort !== sort) {
            return null;
        }

        return filters.direction === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
    };

    const sortableHeader = (sort, label) => (
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(sort)}>
            {label}
            {sortIcon(sort)}
        </button>
    );

    return (
        <>
            <form onSubmit={onSearch} className="mb-4 space-y-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="relative w-full xl:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search users, employees, roles, or creators..."
                            className="h-9 w-full border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                    </div>

                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto xl:overflow-visible">
                        <Filter value={filters.status} onChange={(value) => onFilterChange('status', value)}>
                            <option value="">All Statuses</option>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                        </Filter>
                        <Filter value={filters.role} onChange={(value) => onFilterChange('role', value)}>
                            <option value="">All Roles</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.name}>{role.name}</option>
                            ))}
                        </Filter>
                        <Filter value={filters.employee_link} onChange={(value) => onFilterChange('employee_link', value)}>
                            <option value="">All Links</option>
                            <option value="linked">Linked</option>
                            <option value="unlinked">Unlinked</option>
                        </Filter>
                        <Filter value={filters.online} onChange={(value) => onFilterChange('online', value)}>
                            <option value="">All Online States</option>
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                        </Filter>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    {hasFilters ? (
                        <Button type="button" variant="outline" onClick={onClearFilters}>
                            <X className="size-4" />
                            Clear
                        </Button>
                    ) : null}
                    <Button type="submit" variant="outline">
                        <Search className="size-4" />
                        Search
                    </Button>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted text-foreground shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('name', 'User')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('role', 'Roles')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('employee', 'Employee')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('status', 'Status')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('last_login', 'Last Login')}</th>
                            <th className="px-4 py-3 text-left font-semibold">{sortableHeader('creator', 'Created By')}</th>
                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card">
                        {users.length > 0 ? users.map((user) => (
                            <tr key={user.id} className="border-b border-border align-top">
                                <td className="px-4 py-4">
                                    <p className="font-semibold text-foreground">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                                    <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                                </td>
                                <td className="px-4 py-4 text-muted-foreground">{user.roles.join(', ') || 'None'}</td>
                                <td className="px-4 py-4 text-muted-foreground">
                                    {user.employee ? (
                                        <>
                                            <p className="font-medium text-foreground">{user.employee.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{user.employee.employee_id}</p>
                                        </>
                                    ) : <span className="text-muted-foreground">Unlinked</span>}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="w-fit rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">{user.status}</span>
                                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                                            {user.is_online ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-muted-foreground">{user.last_login_at || 'Never'}</td>
                                <td className="px-4 py-4 text-muted-foreground">{user.created_by_label}</td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => onProfile(user)}>
                                            <Eye className="size-4" />
                                            Profile
                                        </Button>
                                        {can('users.update') ? (
                                            <Button type="button" variant="outline" onClick={() => onEdit(user)}>
                                                <Pencil className="size-4" />
                                                Edit
                                            </Button>
                                        ) : null}
                                        {can('users.reset-password') ? (
                                            <Button type="button" variant="outline" onClick={() => onResetPassword(user)}>
                                                <KeyRound className="size-4" />
                                                Reset
                                            </Button>
                                        ) : null}
                                        {can('users.activate') ? (
                                            <Button type="button" variant="outline" onClick={() => onToggleStatus(user)}>
                                                <Power className="size-4" />
                                                {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        ) : null}
                                        {can('users.link-employees') && user.employee ? (
                                            <Button type="button" variant="outline" onClick={() => onUnlinkEmployee(user)}>
                                                <Unlink className="size-4" />
                                                Unlink
                                            </Button>
                                        ) : null}
                                        {can('users.delete') ? (
                                            <Button type="button" variant="destructive" onClick={() => onDelete(user)}>
                                                <Trash2 className="size-4" />
                                                Delete
                                            </Button>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-muted-foreground/60" />
                                    <p className="text-lg font-semibold text-foreground">{hasFilters ? 'No users found' : 'No users yet'}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {hasFilters ? 'Try different filters or search terms.' : 'Create a user account to get started.'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                    {pagination.total > 0
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} users`
                        : 'Showing 0 users'}
                </p>

                {pagination.lastPage > 1 ? (
                    <div className="flex flex-wrap justify-end gap-2">
                        {pagination.links.map((link, index) => {
                            const page = link.url ? Number(new URL(link.url).searchParams.get('page') ?? 1) : null;
                            const label = link.label.replace('&laquo; Previous', 'Previous').replace('Next &raquo;', 'Next');

                            return (
                                <Button
                                    key={`${link.label}-${index}`}
                                    type="button"
                                    variant={link.active ? 'default' : 'outline'}
                                    disabled={!link.url}
                                    onClick={() => page && onPageChange(page)}
                                >
                                    {label}
                                </Button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </>
    );
}

function Filter({ value, onChange, children }) {
    const options = [];

    Children.forEach(children, (child) => {
        if (!child?.props) {
            return;
        }

        options.push({
            value: child.props.value ?? '',
            label: child.props.children,
        });
    });

    return (
        <Combobox
            value={value ?? ''}
            onValueChange={(nextValue) => onChange(nextValue ?? '')}
            options={options}
            searchPlaceholder="Search option..."
            emptyText="No options found."
            className="h-9 !w-[170px] shrink-0 border-input bg-background text-sm text-foreground"
        />
    );
}
