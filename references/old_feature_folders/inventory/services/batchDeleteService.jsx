import { base44 } from "@/api/base44Client";

/**
 * Deletes inventory items by ID. Returns { deleted, failed, errors }.
 */
export async function batchDeleteInventoryItems(itemIds) {
  const result = { deleted: 0, failed: 0, errors: [] };

  for (const id of itemIds) {
    try {
      await base44.entities.Inventory.delete(id);
      result.deleted++;
    } catch (err) {
      result.failed++;
      result.errors.push({ id, reason: err?.message || "Delete failed" });
    }
  }

  return result;
}