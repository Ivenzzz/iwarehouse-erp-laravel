export function buildWarehouseFormData(warehouse = null) {
    return {
        name: warehouse?.name ?? '',
        warehouse_type: warehouse?.warehouse_type ?? 'store',
        phone_number: warehouse?.phone_number ?? '',
        email: warehouse?.email ?? '',
        street: warehouse?.street ?? '',
        city: warehouse?.city ?? '',
        province: warehouse?.province ?? '',
        zip_code: warehouse?.zip_code ?? '',
        country: warehouse?.country ?? 'PH',
        latitude: warehouse?.latitude ?? '',
        longitude: warehouse?.longitude ?? '',
        sort_order: warehouse?.sort_order ?? 0,
    };
}
