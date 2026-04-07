export function buildSupplierFormData(supplier = null) {
    return {
        legal_business_name: supplier?.legal_business_name ?? '',
        trade_name: supplier?.trade_name ?? '',
        address: supplier?.address ?? '',
        status: supplier?.status ?? 'Active',
        email: supplier?.email ?? '',
        mobile: supplier?.mobile ?? '',
    };
}
