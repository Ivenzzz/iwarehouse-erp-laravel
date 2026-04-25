export const emptyEmployeeFormData = {
    employee_code: '',
    firstname: '',
    lastname: '',
    department_name: '',
    job_title: '',
};

export const buildEmployeeFormData = (employee) => {
    if (!employee) {
        return emptyEmployeeFormData;
    }

    return {
        employee_code: employee.employee_code ?? '',
        firstname: employee.firstname ?? '',
        lastname: employee.lastname ?? '',
        department_name: employee.department_name ?? '',
        job_title: employee.job_title ?? '',
    };
};
