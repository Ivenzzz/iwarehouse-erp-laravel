export function buildSpecs(specDefinitions, productMaster = null) {
    return specDefinitions.reduce((specs, group) => {
        group.definitions.forEach((definition) => {
            specs[definition.key] = productMaster?.specs?.[definition.key] ?? '';
        });

        return specs;
    }, {});
}

export function buildProductMasterFormData(productMaster = null, specDefinitions = []) {
    return {
        brand_id: productMaster?.brand?.id ?? '',
        model_id: productMaster?.model_id ?? '',
        subcategory_id: productMaster?.subcategory_id ?? '',
        description: productMaster?.description ?? '',
        image: null,
        clear_image: false,
        specs: buildSpecs(specDefinitions, productMaster),
    };
}
