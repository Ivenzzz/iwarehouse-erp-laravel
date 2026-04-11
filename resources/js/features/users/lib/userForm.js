export function buildUserFormData(user = null) {
    return {
        name: user?.name ?? '',
        username: user?.username ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        status: user?.status ?? 'active',
        roles: user?.roles ?? [],
        employee_id: user?.employee?.id ? String(user.employee.id) : '',
    };
}
