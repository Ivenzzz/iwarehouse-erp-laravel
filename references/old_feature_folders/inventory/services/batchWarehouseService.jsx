import { base44 } from "@/api/base44Client";

/**
 * Batch updates warehouse_id for a list of inventory item IDs.
 * Returns { succeeded: string[], failed: { id: string, error: string }[] }
 */
export async function batchUpdateWarehouse(itemIds, targetWarehouseId) {
  const succeeded = [];
  const failed = [];

  const promises = itemIds.map(async (id) => {
    try {
      await base44.entities.Inventory.update(id, { warehouse_id: targetWarehouseId });
      succeeded.push(id);
    } catch (err) {
      failed.push({ id, error: err?.message || "Unknown error" });
    }
  });

  await Promise.all(promises);
  return { succeeded, failed };
}