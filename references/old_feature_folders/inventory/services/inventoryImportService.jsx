import { importInventoryItems } from "@/functions/importInventoryItems";

const REQUIRED_COLUMNS = ["Brand", "Model", "Warehouse", "Condition"];

function collapseWhitespace(v) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Client-side CSV header validation only — just enough to catch bad files
 * before sending to the backend.
 */
export function validateInventoryImportCSV(csvText) {
  const lines = String(csvText || "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map(h => collapseWhitespace(h));

  const missing = REQUIRED_COLUMNS.filter(rc => !headers.some(h => h === rc));
  if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  // Count non-empty data rows
  let rowCount = 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) rowCount++;
  }
  if (rowCount === 0) throw new Error("No data rows found in CSV");

  return { rowCount };
}

/**
 * Phase 1: Validate all rows — auto-creates variants, but creates NO inventory.
 * Returns { validRows, skippedItems, variantsCreated, totalRows }
 */
export async function validateInventoryCSV({ csvText }) {
  const response = await importInventoryItems({ csvText, mode: "validate" });
  return response.data;
}

/**
 * Phase 2: Import only the specified valid row indices.
 * Returns { created, failed, skippedItems, createdItems }
 */
export async function importValidatedInventoryRows({ csvText, rowIndices }) {
  const response = await importInventoryItems({ csvText, mode: "import", rowIndices });
  return response.data;
}