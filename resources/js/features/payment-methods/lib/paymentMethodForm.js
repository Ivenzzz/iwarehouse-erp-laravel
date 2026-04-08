export function buildPaymentMethodFormData(paymentMethod = null) {
    return {
        name: paymentMethod?.name ?? '',
        type: paymentMethod?.type ?? 'cash',
        logo: paymentMethod?.logo ?? '',
    };
}

export function formatPaymentMethodType(type) {
    return type
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
