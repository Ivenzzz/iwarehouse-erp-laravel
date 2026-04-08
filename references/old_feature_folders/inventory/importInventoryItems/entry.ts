import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Constants ──

const REQUIRED_COLUMNS = ["Brand", "Model", "Warehouse", "Condition"];
const VARIANT_RAM_KEYS = ["RAM", "ram", "Ram", "RAM Capacity", "ram_capacity"];
const VARIANT_ROM_KEYS = ["ROM", "rom", "Rom", "Storage", "storage", "ROM Capacity", "rom_capacity"];
const VARIANT_COLOR_KEYS = ["Color", "color"];

// ── Normalization Helpers ──

function collapseWhitespace(v) { return String(v ?? "").trim().replace(/\s+/g, " "); }
function normalizeKey(v) { return collapseWhitespace(v).toLowerCase(); }
function cleanWholeNumber(v) { return collapseWhitespace(v).replace(/\.0+$/, ""); }
function cleanIdentifier(v) { return collapseWhitespace(v).replace(/\.0+$/, ""); }

function normalizeStorageValue(v) {
  const raw = normalizeKey(v);
  if (!raw) return "";
  return raw.replace(/\.0+$/, "").replace(/\s*(gb|tb|mb)$/i, "").replace(/\.0+$/, "");
}

function normalizeCondition(v) {
  const n = normalizeKey(v);
  if (!n) return "";
  if (["brandnew", "brand new", "new"].includes(n)) return "brand new";
  if (["certified pre-owned", "certified pre owned", "pre-owned", "pre owned", "cpo"].includes(n)) return "certified pre-owned";
  return n;
}

function parseNumber(v) {
  if (v === null || v === undefined || v === "") return undefined;
  const parsed = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(v) {
  const n = normalizeKey(v);
  if (!n) return false;
  return ["true", "yes", "1"].includes(n);
}

function getAttrValue(variant, keys) {
  const attrs = variant?.attributes || {};
  for (const k of keys) {
    const v = attrs[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function buildRowLabel(row) {
  return [
    collapseWhitespace(row.Brand),
    collapseWhitespace(row.Model),
    cleanWholeNumber(row["RAM Capacity"]),
    cleanWholeNumber(row["ROM Capacity"]),
    collapseWhitespace(row.Color),
    collapseWhitespace(row.Condition),
  ].filter(Boolean).join(" / ") || "Inventory row";
}

// ── CSV Parsing ──

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === delimiter && !inQuotes) { result.push(current); current = ""; }
    else { current += c; }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText) {
  const lines = String(csvText || "").split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], error: "CSV must have a header row and at least one data row." };

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const rawHeaders = parseCSVLine(lines[0], delimiter).map(h => collapseWhitespace(h));

  const missing = REQUIRED_COLUMNS.filter(rc => !rawHeaders.some(h => h === rc));
  if (missing.length > 0) return { rows: [], error: `Missing required columns: ${missing.join(", ")}` };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.every(v => !v.trim())) continue;
    const row = {};
    rawHeaders.forEach((h, idx) => { row[h] = (values[idx] || "").trim(); });
    rows.push(row);
  }
  return { rows, error: null };
}

// ── Auto-create Variant ──

function conditionLabel(normalized) {
  if (normalized === "brand new") return "Brand New";
  if (normalized === "certified pre-owned") return "Certified Pre-Owned";
  return collapseWhitespace(normalized) || "Brand New";
}

function buildVariantName(row, brandName) {
  return [
    collapseWhitespace(brandName),
    collapseWhitespace(row.Model),
    collapseWhitespace(row["Model Code"]),
    cleanWholeNumber(row["RAM Capacity"]),
    cleanWholeNumber(row["ROM Capacity"]),
    collapseWhitespace(row.Color),
    collapseWhitespace(row.Condition),
  ].filter(Boolean).join(" ");
}

function buildVariantSku(row, brandName) {
  const condition = normalizeCondition(row.Condition);
  const parts = [
    collapseWhitespace(brandName),
    collapseWhitespace(row.Model),
    collapseWhitespace(row["Model Code"]),
    cleanWholeNumber(row["RAM Capacity"]),
    cleanWholeNumber(row["ROM Capacity"]),
    collapseWhitespace(row.Color),
  ].filter(Boolean).map(p => p.toUpperCase().replace(/\s+/g, "-"));
  const sku = parts.join("-");
  return condition === "certified pre-owned" ? `CPO-${sku}` : sku;
}

function normalizeCapacityWithUnit(v) {
  const cleaned = cleanWholeNumber(v);
  if (!cleaned) return "";
  // Already has a unit suffix (GB, TB, MB)
  if (/\d\s*(gb|tb|mb)$/i.test(cleaned)) return cleaned.toUpperCase();
  // Pure number — append GB
  if (/^\d+$/.test(cleaned)) {
    const n = parseInt(cleaned, 10);
    return n >= 1024 ? `${n / 1024}TB` : `${n}GB`;
  }
  return cleaned;
}

function buildVariantAttributes(row) {
  const attrs = {};
  const map = [
    ["RAM", row["RAM Capacity"]],
    ["Storage", row["ROM Capacity"]],
    ["Color", row.Color],
    ["Model Code", row["Model Code"]],
    ["RAM Type", row["RAM Type"]],
    ["ROM Type", row["ROM Type"]],
    ["RAM Slot", row["RAM Slot"]],
  ];
  for (const [key, val] of map) {
    let v;
    if (key === "RAM" || key === "Storage") {
      v = normalizeCapacityWithUnit(val);
    } else {
      v = collapseWhitespace(val);
    }
    if (v) attrs[key] = v;
  }
  return attrs;
}

function getNextVariantId(allVariants) {
  let max = 0;
  for (const v of allVariants) {
    const m = (v.product_variant_id || "").match(/^PV(\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > max) max = num;
    }
  }
  return `PV${String(max + 1).padStart(4, "0")}`;
}

async function createVariantForRow(row, productMaster, brandName, allVariants, variantsByMasterId, svc) {
  const condition = normalizeCondition(row.Condition);
  const variantName = buildVariantName(row, brandName);
  const variantSku = buildVariantSku(row, brandName);
  const attributes = buildVariantAttributes(row);
  const productVariantId = getNextVariantId(allVariants);

  const payload = {
    product_master_id: productMaster.id,
    product_variant_id: productVariantId,
    variant_sku: variantSku,
    variant_name: variantName,
    condition: conditionLabel(condition),
    attributes,
    is_active: true,
  };

  const created = await withRetry(() => svc.ProductVariant.create(payload));

  // Add to in-memory maps so subsequent rows can match it
  allVariants.push(created);
  if (!variantsByMasterId.has(productMaster.id)) variantsByMasterId.set(productMaster.id, []);
  variantsByMasterId.get(productMaster.id).push(created);

  return created;
}

// ── Lookup Map Builders ──

function buildLookupMaps(productMasters, variants, warehouses, brands) {
  const brandNameById = new Map(brands.map(b => [b.id, b.name]));

  const productMasterMap = new Map();
  for (const pm of productMasters) {
    const brandName = brandNameById.get(pm.brand_id);
    const key = `${normalizeKey(brandName)}::${normalizeKey(pm.model)}`;
    if (!productMasterMap.has(key)) productMasterMap.set(key, []);
    productMasterMap.get(key).push(pm);
  }

  const variantsByMasterId = new Map();
  for (const v of variants) {
    if (!variantsByMasterId.has(v.product_master_id)) variantsByMasterId.set(v.product_master_id, []);
    variantsByMasterId.get(v.product_master_id).push(v);
  }

  const warehouseMap = new Map();
  for (const w of warehouses) {
    const key = normalizeKey(w.name);
    if (!warehouseMap.has(key)) warehouseMap.set(key, []);
    warehouseMap.get(key).push(w);
  }

  return { productMasterMap, variantsByMasterId, warehouseMap };
}

// ── Resolution Helpers ──

function resolveProductMaster(row, productMasterMap) {
  const key = `${normalizeKey(row.Brand)}::${normalizeKey(row.Model)}`;
  const matches = productMasterMap.get(key) || [];
  if (matches.length === 1) return { match: matches[0] };
  if (matches.length > 1) return { error: "Multiple product masters matched Brand + Model" };
  return { error: "No product master matched Brand + Model" };
}

function resolveVariant(row, productMasterId, variantsByMasterId) {
  const csvRam = normalizeStorageValue(row["RAM Capacity"]);
  const csvRom = normalizeStorageValue(row["ROM Capacity"]);
  const csvColor = normalizeKey(row.Color);
  const csvCondition = normalizeCondition(row.Condition);

  const candidates = (variantsByMasterId.get(productMasterId) || []).filter(v => {
    const vRam = normalizeStorageValue(getAttrValue(v, VARIANT_RAM_KEYS));
    const vRom = normalizeStorageValue(getAttrValue(v, VARIANT_ROM_KEYS));
    const vColor = normalizeKey(getAttrValue(v, VARIANT_COLOR_KEYS));
    const vCondition = normalizeCondition(v.condition);

    const ramMatch = (!csvRam && !vRam) || csvRam === vRam;
    const romMatch = (!csvRom && !vRom) || csvRom === vRom;
    const colorMatch = (!csvColor && !vColor) || csvColor === vColor;
    const conditionMatch = csvCondition === vCondition;

    return ramMatch && romMatch && colorMatch && conditionMatch;
  });

  if (candidates.length === 1) return { match: candidates[0] };
  if (candidates.length > 1) return { error: "Multiple variants matched RAM + ROM + Color + Condition" };
  return { error: "No variant matched RAM + ROM + Color + Condition" };
}

function resolveWarehouse(row, warehouseMap) {
  const matches = warehouseMap.get(normalizeKey(row.Warehouse)) || [];
  if (matches.length === 1) return { match: matches[0] };
  if (matches.length > 1) return { error: "Multiple warehouses matched Warehouse name" };
  return { error: "No warehouse matched Warehouse name" };
}

// ── Bulk Duplicate Check ──

async function buildExistingIdentifiersSet(svc) {
  const allInventory = await fetchAll(svc.Inventory, "-created_date", 100);
  const existing = { serial_number: new Set(), imei1: new Set(), imei2: new Set() };
  for (const item of allInventory) {
    if (item.serial_number) existing.serial_number.add(collapseWhitespace(item.serial_number));
    if (item.imei1) existing.imei1.add(collapseWhitespace(item.imei1));
    if (item.imei2) existing.imei2.add(collapseWhitespace(item.imei2));
  }
  return existing;
}

function checkDuplicateIdentifiers(row, existingIds, batchSeen) {
  const checks = [
    ["serial_number", row["Serial Number"]],
    ["imei1", row["IMEI 1"]],
    ["imei2", row["IMEI 2"]],
  ];

  for (const [field, value] of checks) {
    const v = cleanIdentifier(value);
    if (!v) continue;
    if (existingIds[field].has(v) || batchSeen[field].has(v)) return { field, value: v };
  }
  return null;
}

function markIdentifiersUsed(row, batchSeen) {
  const sn = cleanIdentifier(row["Serial Number"]);
  const i1 = cleanIdentifier(row["IMEI 1"]);
  const i2 = cleanIdentifier(row["IMEI 2"]);
  if (sn) batchSeen.serial_number.add(sn);
  if (i1) batchSeen.imei1.add(i1);
  if (i2) batchSeen.imei2.add(i2);
}

// ── Inventory Payload Builder ──

function resolveStatus(row) {
  const raw = normalizeKey(row.Status);
  const validStatuses = ["available", "transfer", "sold", "quality_check", "rma", "returned_to_supplier", "lost", "in_transit", "bundled"];
  if (validStatuses.includes(raw)) return raw;
  if (raw === "active") return "available";
  return "available";
}

function buildInventoryPayload({ row, productMaster, variant, warehouse, userId }) {
  const now = new Date().toISOString();
  const status = resolveStatus(row);

  return {
    product_master_id: productMaster.id,
    variant_id: variant.id,
    warehouse_id: warehouse.id,
    quantity: 1,
    imei1: cleanIdentifier(row["IMEI 1"]) || undefined,
    imei2: cleanIdentifier(row["IMEI 2"]) || undefined,
    serial_number: cleanIdentifier(row["Serial Number"]) || undefined,
    status,
    cost_price: parseNumber(row.Cost),
    cash_price: parseNumber(row.Cash),
    srp: parseNumber(row.SRP),
    package: collapseWhitespace(row.Package) || "",
    warranty_description: collapseWhitespace(row.Warranty) || "",
    cpu: collapseWhitespace(row.CPU) || "",
    gpu: collapseWhitespace(row.GPU) || "",
    submodel: collapseWhitespace(row.Submodel) || "",
    ram_type: collapseWhitespace(row["RAM Type"]) || "",
    rom_type: collapseWhitespace(row["ROM Type"]) || "",
    ram_slots: collapseWhitespace(row["RAM Slot"]) || "",
    product_type: collapseWhitespace(row["Product Type"]) || "",
    country_model: collapseWhitespace(row["Country Model"]) || "",
    with_charger: parseBoolean(row["With Charger"]),
    resolution: collapseWhitespace(row.Resolution) || "",
    logs: [{
      timestamp: now,
      action: "CSV_IMPORT",
      actor_id: userId,
      notes: `Imported from inventory CSV for ${collapseWhitespace(row.Brand)} ${collapseWhitespace(row.Model)}`.trim(),
    }],
    created_at: now,
    updated_at: now,
  };
}

// ── Retry with backoff for rate limits ──

async function withRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || err || "").toLowerCase();
      const isRateLimit = msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("429");
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt), 16000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ── Paginated entity fetch ──

async function fetchAll(entityRef, sortField = "-created_date", pageSize = 100) {
  const all = [];
  let page = 0;
  while (true) {
    const batch = await withRetry(() => entityRef.list(sortField, pageSize, page * pageSize));
    if (!batch || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }
  return all;
}

// ── Shared: fetch reference data + build maps ──

async function loadReferenceData(svc) {
  const [productMasters, variants, warehouses, brands] = await Promise.all([
    fetchAll(svc.ProductMaster),
    fetchAll(svc.ProductVariant),
    fetchAll(svc.Warehouse),
    fetchAll(svc.ProductBrand),
  ]);
  const brandNameById = new Map(brands.map(b => [b.id, b.name]));
  const maps = buildLookupMaps(productMasters, variants, warehouses, brands);
  return { productMasters, variants, warehouses, brands, brandNameById, ...maps };
}

// ── Validate a single row (synchronous — uses pre-loaded sets) ──

async function validateRow({ row, rowNumber, ref, svc, existingIds, batchSeen }) {
  const label = buildRowLabel(row);

  // Resolve product master
  const masterRes = resolveProductMaster(row, ref.productMasterMap);
  if (!masterRes.match) return { valid: false, label, reason: masterRes.error };

  // Resolve variant — auto-create if not found
  let variantRes = resolveVariant(row, masterRes.match.id, ref.variantsByMasterId);
  let variantCreated = false;
  if (!variantRes.match) {
    try {
      const brandName = ref.brandNameById.get(masterRes.match.brand_id) || "";
      const newVariant = await createVariantForRow(row, masterRes.match, brandName, ref.variants, ref.variantsByMasterId, svc);
      variantRes = { match: newVariant };
      variantCreated = true;
    } catch (varErr) {
      return { valid: false, label, reason: `Failed to auto-create variant: ${varErr?.message || varErr}` };
    }
  }

  // Resolve warehouse
  const warehouseRes = resolveWarehouse(row, ref.warehouseMap);
  if (!warehouseRes.match) return { valid: false, label, reason: warehouseRes.error };

  // Check duplicate identifiers (in-memory — no API calls)
  const dup = checkDuplicateIdentifiers(row, existingIds, batchSeen);
  if (dup) return { valid: false, label, reason: `Duplicate ${dup.field} already exists: ${dup.value}` };

  // Mark identifiers as used so subsequent rows in same batch detect intra-batch dupes
  markIdentifiersUsed(row, batchSeen);

  return {
    valid: true,
    label,
    variantCreated,
    productMaster: masterRes.match,
    variant: variantRes.match,
    warehouse: warehouseRes.match,
  };
}

// ── Concurrency helper — run promises in batches ──

async function processConcurrently(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Mode: validate ──

async function handleValidate(csvText, svc) {
  const { rows, error: parseError } = parseCSV(csvText);
  if (parseError) return Response.json({ error: parseError }, { status: 400 });
  if (rows.length === 0) return Response.json({ error: "CSV has no data rows." }, { status: 400 });

  const [ref, existingIds] = await Promise.all([
    loadReferenceData(svc),
    buildExistingIdentifiersSet(svc),
  ]);

  const batchSeen = { serial_number: new Set(), imei1: new Set(), imei2: new Set() };
  const validRows = [];
  const skippedItems = [];
  let variantsCreated = 0;

  // Sequential because auto-create variant mutates shared ref
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;
    const result = await validateRow({ row, rowNumber, ref, svc, existingIds, batchSeen });

    if (!result.valid) {
      skippedItems.push({ row: rowNumber, label: result.label, reason: result.reason });
    } else {
      if (result.variantCreated) variantsCreated++;
      validRows.push({
        row: rowNumber,
        label: result.label,
        warehouse: result.warehouse.name,
        rowIndex: i,
      });
    }
  }

  return Response.json({ validRows, skippedItems, variantsCreated, totalRows: rows.length });
}

// ── Mode: import ──

const BULK_CHUNK_SIZE = 25;

async function handleImport(csvText, rowIndices, userId, svc) {
  const { rows, error: parseError } = parseCSV(csvText);
  if (parseError) return Response.json({ error: parseError }, { status: 400 });

  const [ref, existingIds] = await Promise.all([
    loadReferenceData(svc),
    buildExistingIdentifiersSet(svc),
  ]);

  const batchSeen = { serial_number: new Set(), imei1: new Set(), imei2: new Set() };
  const indicesToImport = new Set(rowIndices);

  // Phase 1: Validate all rows and build payloads
  const validatedPayloads = [];
  const result = { created: 0, failed: 0, skippedItems: [], createdItems: [] };

  for (const idx of indicesToImport) {
    const row = rows[idx];
    if (!row) {
      result.failed++;
      result.skippedItems.push({ row: idx + 2, label: "Unknown row", reason: "Row index out of range" });
      continue;
    }
    const rowNumber = idx + 2;
    const label = buildRowLabel(row);

    const vResult = await validateRow({ row, rowNumber, ref, svc, existingIds, batchSeen });
    if (!vResult.valid) {
      result.failed++;
      result.skippedItems.push({ row: rowNumber, label, reason: vResult.reason });
      continue;
    }

    const payload = buildInventoryPayload({
      row,
      productMaster: vResult.productMaster,
      variant: vResult.variant,
      warehouse: vResult.warehouse,
      userId,
    });

    validatedPayloads.push({ rowNumber, label, warehouse: vResult.warehouse.name, payload });
  }

  // Phase 2: Bulk-create in chunks
  for (let i = 0; i < validatedPayloads.length; i += BULK_CHUNK_SIZE) {
    const chunk = validatedPayloads.slice(i, i + BULK_CHUNK_SIZE);
    const payloads = chunk.map(c => c.payload);

    try {
      await withRetry(() => svc.Inventory.bulkCreate(payloads));
      for (const c of chunk) {
        result.created++;
        result.createdItems.push({ row: c.rowNumber, label: c.label, warehouse: c.warehouse });
      }
    } catch (bulkErr) {
      // Fallback: try individually so partial success is possible
      for (const c of chunk) {
        try {
          await withRetry(() => svc.Inventory.create(c.payload));
          result.created++;
          result.createdItems.push({ row: c.rowNumber, label: c.label, warehouse: c.warehouse });
        } catch (singleErr) {
          result.failed++;
          result.skippedItems.push({ row: c.rowNumber, label: c.label, reason: singleErr?.message || "Failed to create inventory item" });
        }
      }
    }
  }

  return Response.json(result);
}

// ── Main Handler ──

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { csvText, mode = "validate", rowIndices } = body;

  if (!csvText) return Response.json({ error: "Missing csvText" }, { status: 400 });

  const svc = base44.asServiceRole.entities;

  if (mode === "validate") {
    return handleValidate(csvText, svc);
  }

  if (mode === "import") {
    if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
      return Response.json({ error: "Missing rowIndices for import mode" }, { status: 400 });
    }
    return handleImport(csvText, rowIndices, user.id, svc);
  }

  return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
});