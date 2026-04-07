export function buildCategoryFormData(category = null) {
    return {
        name: category?.name ?? '',
        parent_category_id: category?.parent_category_id ?? '',
    };
}
