export function normalizeVariantSkuToken(value) {
    return String(value ?? '')
        .trim()
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
}

export function buildVariantSkuPreview(brandName, modelName, condition, attributes = {}) {
    const parts = [
        normalizeVariantSkuToken(brandName),
        normalizeVariantSkuToken(modelName),
        normalizeVariantSkuToken(attributes.ram),
        normalizeVariantSkuToken(attributes.rom),
        normalizeVariantSkuToken(attributes.color),
    ].filter(Boolean);

    const sku = parts.join('-');

    return condition === 'Certified Pre-Owned' ? `CPO-${sku}` : sku;
}

export function buildVariantNamePreview(brandName, modelName, condition, attributes = {}) {
    return [
        String(brandName ?? '').trim(),
        String(modelName ?? '').trim(),
        String(attributes.ram ?? '').trim(),
        String(attributes.rom ?? '').trim(),
        String(attributes.color ?? '').trim(),
    ]
        .filter(Boolean)
        .join(' ');
}

export function calculateVariantGenerationCount({
    conditions = [],
    colors = [],
    rams = [],
    roms = [],
}) {
    const colorCount = colors.length > 0 ? colors.length : 1;
    const ramCount = rams.length > 0 ? rams.length : 1;
    const romCount = roms.length > 0 ? roms.length : 1;

    return conditions.length * colorCount * ramCount * romCount;
}

export function getVariantDefinitionMap(variantDefinitions) {
    return (variantDefinitions?.groups ?? []).flatMap((group) => group.definitions ?? []);
}

export function getEditableAttributeDefinitions(variantDefinitions) {
    return getVariantDefinitionMap(variantDefinitions).filter(
        (definition) => definition.key !== 'condition',
    );
}

export function sanitizeVariantAttributes(attributes = {}, variantDefinitions) {
    const allowedKeys = new Set(
        getEditableAttributeDefinitions(variantDefinitions).map((definition) => definition.key),
    );

    return Object.entries(attributes).reduce((sanitized, [key, value]) => {
        if (!allowedKeys.has(key)) {
            return sanitized;
        }

        sanitized[key] = value;

        return sanitized;
    }, {});
}
