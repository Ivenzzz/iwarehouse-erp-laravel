import { base44 } from "@/api/base44Client";

/**
 * Checks IMEI/SN uniqueness across the entire inventory, excluding the given item IDs.
 * Returns a Set of values that already exist on OTHER inventory items.
 */
async function getConflictingSerials(fieldName, value, excludeIds) {
  if (!value) return false;
  try {
    const existing = await base44.entities.Inventory.filter({ [fieldName]: value });
    return existing.some((inv) => !excludeIds.has(inv.id));
  } catch {
    return false;
  }
}

/**
 * Batch update inventory items with the provided field values.
 * - Blank/undefined fields are skipped (leave unchanged).
 * - IMEI1, IMEI2, serial_number enforce uniqueness; conflicts are skipped per-item.
 * - variant_id change also updates product_master_id (looked up from provided variantMap).
 * - purchase_file_data is a full replacement.
 *
 * @param {string[]} itemIds
 * @param {object} updateFields - flat object of field => value
 * @param {object} options - { variantMap }
 * @returns {{ succeeded: string[], failed: { id: string, error: string }[], skippedConflicts: { id: string, field: string, value: string }[] }}
 */
export async function batchUpdateInventory(itemIds, updateFields, options = {}) {
  const { variantMap = new Map() } = options;
  const succeeded = [];
  const failed = [];
  const skippedConflicts = [];

  // Build the payload excluding blank values
  const basePayload = {};
  const serialFields = ["imei1", "imei2", "serial_number"];

  for (const [key, value] of Object.entries(updateFields)) {
    if (value === "" || value === undefined || value === null) continue;

    // If variant changed, also set product_master_id
    if (key === "variant_id") {
      const variant = variantMap.get(value);
      if (variant) {
        basePayload.variant_id = value;
        basePayload.product_master_id = variant.product_master_id;
      }
      continue;
    }

    // purchase_file_data: strip blank sub-fields, skip if all empty
    if (key === "purchase_file_data" && typeof value === "object") {
      const cleaned = {};
      for (const [sk, sv] of Object.entries(value)) {
        if (sv !== "" && sv !== undefined && sv !== null) cleaned[sk] = sv;
      }
      if (Object.keys(cleaned).length > 0) {
        basePayload.purchase_file_data = cleaned;
      }
      continue;
    }

    basePayload[key] = value;
  }

  // If variant_id was in updateFields but not yet in basePayload (variant not found), skip it
  if (updateFields.variant_id && !basePayload.variant_id) {
    // variant not in map — skip the variant change silently
  }

  const excludeIdSet = new Set(itemIds);

  // Process items concurrently
  const promises = itemIds.map(async (id) => {
    try {
      const itemPayload = { ...basePayload };

      // Per-item IMEI/SN uniqueness check
      for (const field of serialFields) {
        if (itemPayload[field]) {
          const hasConflict = await getConflictingSerials(field, itemPayload[field], excludeIdSet);
          if (hasConflict) {
            skippedConflicts.push({ id, field, value: itemPayload[field] });
            delete itemPayload[field]; // remove conflicting field from this item's update
          }
        }
      }

      // If nothing left to update after removing conflicts, still count as success
      if (Object.keys(itemPayload).length === 0) {
        succeeded.push(id);
        return;
      }

      await base44.entities.Inventory.update(id, itemPayload);
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err?.message || "Unknown error" });
    }
  });

  await Promise.all(promises);
  return { succeeded, failed, skippedConflicts };
}