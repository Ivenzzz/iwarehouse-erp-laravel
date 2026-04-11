export const emptyCustomerFormData = (customerGroups = [], customerTypes = []) => ({
    customer_kind: 'person',
    firstname: '',
    lastname: '',
    organization_name: '',
    legal_name: '',
    tax_id: '',
    date_of_birth: '',
    customer_group_id: String(customerGroups[0]?.id ?? ''),
    customer_type_id: String(customerTypes[0]?.id ?? ''),
    status: 'active',
    contact_firstname: '',
    contact_lastname: '',
    email: '',
    phone: '',
    street: '',
    region: '',
    province: '',
    city_municipality: '',
    barangay: '',
    postal_code: '',
});

export const buildCustomerFormData = (customer, customerGroups = [], customerTypes = []) => {
    if (!customer) {
        return emptyCustomerFormData(customerGroups, customerTypes);
    }

    return {
        customer_kind: customer.customer_kind ?? 'person',
        firstname: customer.firstname ?? '',
        lastname: customer.lastname ?? '',
        organization_name: customer.organization_name ?? '',
        legal_name: customer.legal_name ?? '',
        tax_id: customer.tax_id ?? '',
        date_of_birth: customer.date_of_birth ?? '',
        customer_group_id: String(customer.customer_group_id ?? customerGroups[0]?.id ?? ''),
        customer_type_id: String(customer.customer_type_id ?? customerTypes[0]?.id ?? ''),
        status: customer.status ?? 'active',
        contact_firstname: customer.contact?.firstname ?? '',
        contact_lastname: customer.contact?.lastname ?? '',
        email: customer.contact?.email ?? '',
        phone: customer.contact?.phone ?? '',
        street: customer.address?.street ?? '',
        region: customer.address?.region ?? '',
        province: customer.address?.province ?? '',
        city_municipality: customer.address?.city_municipality ?? '',
        barangay: customer.address?.barangay ?? '',
        postal_code: customer.address?.postal_code ?? '',
    };
};
