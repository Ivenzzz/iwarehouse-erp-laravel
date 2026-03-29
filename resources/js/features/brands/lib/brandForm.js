export function emptyModelRow() {
    return {
        id: null,
        model_name: '',
    };
}

export function buildFormData(brand = null) {
    return {
        name: brand?.name ?? '',
        models:
            brand?.models?.length > 0
                ? brand.models.map((model) => ({
                      id: model.id ?? null,
                      model_name: model.model_name ?? '',
                  }))
                : [emptyModelRow()],
    };
}
