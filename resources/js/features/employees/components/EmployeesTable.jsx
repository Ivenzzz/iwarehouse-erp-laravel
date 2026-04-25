import { Button } from '@/shared/components/ui/button';
import { ArrowDown, ArrowUp, Pencil, Rows3, Search, Trash2, X } from 'lucide-react';

export default function EmployeesTable({
    employees,
    pagination,
    filters,
    search,
    onSearchChange,
    onSearch,
    onClearSearch,
    onSort,
    onPageChange,
    onEdit,
    onDelete,
}) {
    const hasFilters = Boolean(filters.search);

    const sortIcon = (sort) => {
        if (filters.sort !== sort) {
            return null;
        }

        return filters.direction === 'asc' ? (
            <ArrowUp className="size-3.5" />
        ) : (
            <ArrowDown className="size-3.5" />
        );
    };

    const sortableHeader = (sort, label) => (
        <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-slate-950"
            onClick={() => onSort(sort)}
        >
            {label}
            {sortIcon(sort)}
        </button>
    );

    return (
        <>
            <form onSubmit={onSearch} className="mb-4 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="relative w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search code, name, department, or job title..."
                            className="h-9 w-full border-0 border-b border-input bg-transparent pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:border-b-2 focus:ring-0"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    {hasFilters && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClearSearch}
                            className="h-9 border-border text-foreground hover:bg-accent"
                        >
                            <X className="size-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto rounded-md border border-border">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-table-header text-table-header-foreground backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('employee_code', 'Employee Code')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('firstname', 'Firstname')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('lastname', 'Lastname')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('department_name', 'Department Name')}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">
                                {sortableHeader('job_title', 'JobTitle')}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-table-body text-table-body-foreground">
                        {employees.length > 0 ? (
                            employees.map((employee) => (
                                <tr
                                    key={employee.id}
                                    className="group border-b border-border align-top transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-4 font-semibold text-foreground">{employee.employee_code}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{employee.firstname}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{employee.lastname}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{employee.department_name}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{employee.job_title}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onEdit(employee)}
                                                className="hover:bg-warning/10 hover:text-warning"
                                            >
                                                <Pencil className="size-4 text-warning" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                onClick={() => onDelete(employee)}
                                                className="hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <Rows3 className="mx-auto mb-4 size-10 text-muted-foreground/30" />
                                    <p className="text-lg font-semibold text-foreground">
                                        {hasFilters ? 'No employees found' : 'No employees yet'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {hasFilters
                                            ? 'Try different employee search terms.'
                                            : 'Create an employee manually or import a CSV containing employee details.'}
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
                        ? `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} employees`
                        : 'Showing 0 employees'}
                </p>

                {pagination.lastPage > 1 && (
                    <div className="flex flex-wrap justify-end gap-2">
                        {pagination.links.map((link, index) => {
                            const page = link.url
                                ? Number(new URL(link.url).searchParams.get('page') ?? 1)
                                : null;
                            const label = link.label
                                .replace('&laquo; Previous', 'Previous')
                                .replace('Next &raquo;', 'Next');

                            return (
                                <Button
                                    key={`${link.label}-${index}`}
                                    type="button"
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => page && onPageChange(page)}
                                    className={!link.active ? 'border-border text-foreground hover:bg-accent' : ''}
                                >
                                    {label}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
