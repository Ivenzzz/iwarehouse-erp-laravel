/**
 * Resolves display labels for an RFQ item directly from its denormalized fields.
 * No external joins needed — all data is embedded on the item itself.
 */
export function getRFQItemDisplay(item = {}) {
  const brand = item.brand || "";
  const model = item.model || "";
  const variantName = item.variant_name || "";

  const primaryLabel =
    variantName || [brand, model].filter(Boolean).join(" ") || "Unknown Product";

  const attrs = item.attributes || {};
  const specParts = [attrs.RAM, attrs.Storage, item.condition].filter(Boolean);
  const secondaryLabel = specParts.join(" / ") || item.description || "";

  return { primaryLabel, secondaryLabel };
}