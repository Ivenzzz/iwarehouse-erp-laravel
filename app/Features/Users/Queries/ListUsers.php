<?php

namespace App\Features\Users\Queries;

use App\Features\Users\Support\UserManagement;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;

class ListUsers
{
    public function __invoke(Request $request): array
    {
        $filters = $this->filters($request);
        $lastLoginSubquery = $this->lastLoginSubquery();

        $query = User::query()
            ->with(['roles', 'createdBy', 'employeeAccount.employee.jobTitle.department'])
            ->addSelect([
                'last_login_at' => $lastLoginSubquery,
            ])
            ->when($filters['search'] !== '', fn ($query) => $this->applySearch($query, $filters['search']))
            ->when($filters['status'] !== '', fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['role'] !== '', fn ($query) => $query->role($filters['role']))
            ->when($filters['employee_link'] === 'linked', fn ($query) => $query->whereHas('employeeAccount'))
            ->when($filters['employee_link'] === 'unlinked', fn ($query) => $query->whereDoesntHave('employeeAccount'));

        $onlineUserIds = $this->onlineUserIds();

        if ($filters['online'] === 'online') {
            $query->whereIn('users.id', $onlineUserIds ?: [0]);
        } elseif ($filters['online'] === 'offline') {
            $query->whereNotIn('users.id', $onlineUserIds ?: [0]);
        }

        $this->applySort($query, $filters['sort'], $filters['direction']);

        return [
            'users' => $query
                ->paginate(10)
                ->withQueryString()
                ->through(fn (User $user) => $this->transform($user, $onlineUserIds)),
            'roles' => Role::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'employees' => $this->employeeOptions(),
            'statuses' => UserManagement::statuses(),
            'filters' => $filters,
        ];
    }

    public function profile(User $user): array
    {
        $user->load(['roles', 'createdBy', 'employeeAccount.employee.jobTitle.department']);
        $onlineUserIds = $this->onlineUserIds();

        return [
            'user' => $this->transform($user, $onlineUserIds),
            'loginHistory' => Activity::query()
                ->where('log_name', 'auth')
                ->where('description', 'user.logged_in')
                ->where('subject_type', User::class)
                ->where('subject_id', $user->id)
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity) => [
                    'id' => $activity->id,
                    'logged_in_at' => optional($activity->created_at)?->toDateTimeString(),
                    'ip_address' => $activity->getExtraProperty('ip_address'),
                    'user_agent' => $activity->getExtraProperty('user_agent'),
                    'session_id' => $activity->getExtraProperty('session_id'),
                ])
                ->values(),
        ];
    }

    private function filters(Request $request): array
    {
        $role = trim((string) $request->query('role', ''));

        if ($role !== '' && ! Role::query()->where('name', $role)->exists()) {
            $role = '';
        }

        return [
            'search' => trim((string) $request->query('search', '')),
            'sort' => in_array($request->query('sort'), ['name', 'username', 'email', 'role', 'employee', 'creator', 'status', 'last_login', 'created_at'], true)
                ? $request->query('sort')
                : 'created_at',
            'direction' => $request->query('direction') === 'asc' ? 'asc' : 'desc',
            'status' => in_array($request->query('status'), UserManagement::statuses(), true)
                ? $request->query('status')
                : '',
            'role' => $role,
            'employee_link' => in_array($request->query('employee_link'), ['linked', 'unlinked'], true)
                ? $request->query('employee_link')
                : '',
            'online' => in_array($request->query('online'), ['online', 'offline'], true)
                ? $request->query('online')
                : '',
        ];
    }

    private function applySearch($query, string $search): void
    {
        $query->where(function ($query) use ($search): void {
            $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhereHas('createdBy', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                ->orWhereHas('roles', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                ->orWhereHas('employeeAccount.employee', function ($query) use ($search): void {
                    $query
                        ->where('employee_id', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
        });
    }

    private function applySort($query, string $sort, string $direction): void
    {
        match ($sort) {
            'role' => $query->orderByRaw($this->roleSortSql()." {$direction}"),
            'employee' => $query->orderByRaw($this->employeeSortSql()." {$direction}"),
            'creator' => $query->orderByRaw($this->creatorSortSql()." {$direction}"),
            'last_login' => $query->orderBy('last_login_at', $direction),
            default => $query->orderBy("users.{$sort}", $direction),
        };

        $query->orderBy('users.id');
    }

    private function transform(User $user, array $onlineUserIds): array
    {
        $employee = $user->employeeAccount?->employee;
        $lastLoginAt = $user->getAttribute('last_login_at') ?? Activity::query()
            ->where('log_name', 'auth')
            ->where('description', 'user.logged_in')
            ->where('subject_type', User::class)
            ->where('subject_id', $user->id)
            ->max('created_at');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'status' => $user->status,
            'roles' => $user->roles->pluck('name')->values(),
            'created_by' => $user->createdBy
                ? ['id' => $user->createdBy->id, 'name' => $user->createdBy->name]
                : null,
            'created_by_label' => $user->createdBy?->name ?? 'System',
            'employee' => $employee ? [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'full_name' => $this->employeeName($employee),
                'email' => $employee->email,
                'phone' => $employee->phone,
                'status' => $employee->status,
                'job_title' => $employee->jobTitle?->name,
                'department' => $employee->jobTitle?->department?->name,
            ] : null,
            'is_online' => in_array($user->id, $onlineUserIds, true),
            'last_login_at' => $lastLoginAt
                ? Carbon::parse($lastLoginAt)->toDateTimeString()
                : null,
            'created_at' => optional($user->created_at)?->toDateTimeString(),
            'updated_at' => optional($user->updated_at)?->toDateTimeString(),
        ];
    }

    private function employeeOptions(): array
    {
        return Employee::query()
            ->with(['employeeAccount.user', 'jobTitle.department'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'employee_id' => $employee->employee_id,
                'full_name' => $this->employeeName($employee),
                'email' => $employee->email,
                'status' => $employee->status,
                'job_title' => $employee->jobTitle?->name,
                'department' => $employee->jobTitle?->department?->name,
                'linked_user_id' => $employee->employeeAccount?->user_id,
                'linked_user_name' => $employee->employeeAccount?->user?->name,
            ])
            ->values()
            ->all();
    }

    private function employeeName(Employee $employee): string
    {
        return trim(implode(' ', array_filter([
            $employee->first_name,
            $employee->middle_name,
            $employee->last_name,
        ])));
    }

    private function onlineUserIds(): array
    {
        return DB::table('sessions')
            ->whereNotNull('user_id')
            ->where('last_activity', '>=', now()->subMinutes(5)->timestamp)
            ->distinct()
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function lastLoginSubquery()
    {
        return Activity::query()
            ->selectRaw('MAX(created_at)')
            ->whereColumn('subject_id', 'users.id')
            ->where('subject_type', User::class)
            ->where('log_name', 'auth')
            ->where('description', 'user.logged_in');
    }

    private function roleSortSql(): string
    {
        return "(select min(roles.name) from roles inner join model_has_roles on roles.id = model_has_roles.role_id where model_has_roles.model_id = users.id and model_has_roles.model_type = '".addslashes(User::class)."')";
    }

    private function employeeSortSql(): string
    {
        return "(select employees.last_name from employees inner join employee_accounts on employees.id = employee_accounts.employee_id where employee_accounts.user_id = users.id limit 1)";
    }

    private function creatorSortSql(): string
    {
        return '(select creators.name from users as creators where creators.id = users.created_by_id)';
    }
}
