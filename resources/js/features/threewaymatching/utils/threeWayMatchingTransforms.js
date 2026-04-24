import { buildRequestItemKey, getVariantCondition, getVariantRam, getVariantRom } from "@/components/stockrequest/stockRequestItemUtils";
import { buildSpecSummary, formatMoney, formatQuantity } from "./threeWayMatchingFormatters";
import { CHECK_META, DISCREPANCY, MATCHED, PENDING } from "./threeWayMatchingMeta";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getRecordTimestamp = (record) => {
  const candidates = [
    record?.updated_date,
    record?.updated_at,
    record?.created_date,
    record?.created_at,
    record?.date_encoded,
    record?.date_received,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return 0;
};

const getLatestLinkedRecord = (records = []) => {
  if (records.length === 0) {
    return { record: null, additionalCount: 0 };
  }

  const sorted = [...records].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
  return {
    record: sorted[0],
    additionalCount: Math.max(0, sorted.length - 1),
  };
};

const getSupplierName = (supplier) =>
  supplier?.master_profile?.legal_business_name ||
  supplier?.master_profile?.trade_name ||
  supplier?.CompanyName ||
  "Unknown Supplier";

const getProductName = (productMaster) =>
  productMaster?.model || productMaster?.name || productMaster?.master_sku || "Unknown Product";

const buildItemLabel = ({ productMaster, description, spec = {} }) => {
  const specLabel = [spec.ram, spec.rom, spec.condition].filter(Boolean).join(" / ");
  const baseLabel = getProductName(productMaster);
  const detail = specLabel || description || "";

  return [baseLabel, detail].filter(Boolean).join(" - ");
};

const buildNormalizedItemKey = ({ productMasterId, spec = {}, description, productName }) => {
  if (productMasterId || spec.ram || spec.rom || spec.condition) {
    return buildRequestItemKey(productMasterId || "", {
      ram: spec.ram || "",
      rom: spec.rom || "",
      condition: spec.condition || "",
    });
  }

  return `text::${normalizeText([productName, description].filter(Boolean).join(" "))}`;
};

const addAggregatedLine = (lineMap, line) => {
  const existing = lineMap.get(line.key);

  if (existing) {
    existing.quantity += line.quantity;
    existing.amount += line.amount;
    existing.rowCount += 1;
    existing.unitPrice = existing.unitPrice ?? line.unitPrice;
    existing.label = existing.label || line.label;
    existing.productMasterId = existing.productMasterId || line.productMasterId;
    existing.spec = existing.spec || line.spec;
    return;
  }

  lineMap.set(line.key, {
    key: line.key,
    label: line.label,
    productMasterId: line.productMasterId,
    spec: line.spec,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: line.amount,
    rowCount: 1,
  });
};

const getGRNLinkedDrId = (grn) => grn?.dr_id || grn?.receipt_info?.dr_id || "";

const getGRNQuantity = (item) => {
  const serials = item?.serials || item?.serial_numbers || [];
  if (Array.isArray(serials) && serials.length > 0) {
    return serials.length;
  }

  const explicitQuantity =
    Number(item?.quantities?.quantity_received) ||
    Number(item?.quantity_received) ||
    Number(item?.actual_quantity) ||
    Number(item?.quantity);

  if (explicitQuantity > 0) return explicitQuantity;
  if (item?.identifiers || item?.pricing || item?.variant_id) return 1;
  return 0;
};

const areAmountsEqual = (left, right) => Math.abs((Number(left) || 0) - (Number(right) || 0)) < 0.0001;

const createPOLineMap = (po, productMasterMap) => {
  const lineMap = new Map();
  const items = po?.items_json?.items || [];

  items.forEach((item) => {
    const productMaster = productMasterMap.get(item.product_master_id);
    const spec = {
      ram: item.product_spec?.ram || "",
      rom: item.product_spec?.rom || "",
      condition: item.product_spec?.condition || "",
    };
    const key = buildNormalizedItemKey({
      productMasterId: item.product_master_id,
      spec,
      description: item.description,
      productName: getProductName(productMaster),
    });

    addAggregatedLine(lineMap, {
      key,
      label: buildItemLabel({ productMaster, description: item.description, spec }),
      productMasterId: item.product_master_id || "",
      spec,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      amount: Number(item.total_price) || (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    });
  });

  return lineMap;
};

const createInvoiceLineMap = (deliveryReceipt, productMasterMap) => {
  const lineMap = new Map();
  const items = deliveryReceipt?.declared_items_json?.items || [];

  items.forEach((item) => {
    const productMaster = productMasterMap.get(item.product_master_id);
    const spec = {
      ram: item.product_spec?.ram || "",
      rom: item.product_spec?.rom || "",
      condition: item.product_spec?.condition || "",
    };
    const quantity = Number(item.actual_quantity ?? item.expected_quantity) || 0;
    const unitPrice = Number(item.unit_cost) || 0;
    const key = buildNormalizedItemKey({
      productMasterId: item.product_master_id,
      spec,
      description: item.variance_notes,
      productName: getProductName(productMaster),
    });

    addAggregatedLine(lineMap, {
      key,
      label: buildItemLabel({ productMaster, description: item.variance_notes, spec }),
      productMasterId: item.product_master_id || "",
      spec,
      quantity,
      unitPrice,
      amount: Number(item.total_value) || quantity * unitPrice,
    });
  });

  return lineMap;
};

const createGRNLineMap = (goodsReceipt, productMasterMap, productVariantMap) => {
  const lineMap = new Map();
  const items = goodsReceipt?.items || [];

  items.forEach((item) => {
    const variant = productVariantMap.get(item.variant_id);
    const productMasterId = item.product_master_id || variant?.product_master_id || "";
    const productMaster = productMasterMap.get(productMasterId);
    const spec = {
      ram: getVariantRam(variant) || "",
      rom: getVariantRom(variant) || "",
      condition: item.condition || getVariantCondition(variant) || "",
    };
    const quantity = getGRNQuantity(item);
    if (quantity <= 0) return;

    const key = buildNormalizedItemKey({
      productMasterId,
      spec,
      description: item.item_notes,
      productName: variant?.variant_name || getProductName(productMaster),
    });

    addAggregatedLine(lineMap, {
      key,
      label: buildItemLabel({ productMaster, description: variant?.variant_name || item.item_notes, spec }),
      productMasterId,
      spec,
      quantity,
      unitPrice: null,
      amount: 0,
    });
  });

  return lineMap;
};

export const getCheckState = (value) => CHECK_META[value] || CHECK_META.na;

const buildComparisonLines = (poLineMap, invoiceLineMap, grnLineMap) => {
  const allKeys = new Set([...poLineMap.keys(), ...invoiceLineMap.keys(), ...grnLineMap.keys()]);
  const lines = [];

  allKeys.forEach((key) => {
    const poLine = poLineMap.get(key) || null;
    const invoiceLine = invoiceLineMap.get(key) || null;
    const grnLine = grnLineMap.get(key) || null;
    const issues = [];

    const identityStatus = poLine && invoiceLine && grnLine ? "pass" : "fail";
    if (!poLine) issues.push("Item exists on the invoice or goods receipt but not on the purchase order.");
    if (!invoiceLine) issues.push("Item is missing from the billed document.");
    if (!grnLine) issues.push("Item is missing from the goods receipt.");

    let quantityStatus = "na";
    if (invoiceLine) {
      quantityStatus = grnLine && invoiceLine.quantity <= grnLine.quantity ? "pass" : "fail";
      if (grnLine && invoiceLine.quantity > grnLine.quantity) {
        issues.push(
          `Invoice quantity ${formatQuantity(invoiceLine.quantity)} exceeds received quantity ${formatQuantity(grnLine.quantity)}.`
        );
      }
    }

    let priceStatus = "na";
    if (invoiceLine) {
      priceStatus = poLine && areAmountsEqual(invoiceLine.unitPrice, poLine.unitPrice) ? "pass" : "fail";
      if (poLine && !areAmountsEqual(invoiceLine.unitPrice, poLine.unitPrice)) {
        issues.push(
          `Invoice price ${formatMoney(invoiceLine.unitPrice)} does not match PO price ${formatMoney(poLine.unitPrice)}.`
        );
      }
    }

    lines.push({
      key,
      label: invoiceLine?.label || poLine?.label || grnLine?.label || "Unknown Item",
      poLabel: poLine?.label || "Missing on PO",
      grnLabel: grnLine?.label || "Missing on GR",
      invoiceLabel: invoiceLine?.label || "Missing on invoice",
      poSpec: poLine?.spec || null,
      grnSpec: grnLine?.spec || null,
      invoiceSpec: invoiceLine?.spec || null,
      poAmount: poLine?.amount ?? 0,
      invoiceAmount: invoiceLine?.amount ?? 0,
      poQuantity: poLine?.quantity ?? 0,
      grnQuantity: grnLine?.quantity ?? 0,
      invoiceQuantity: invoiceLine?.quantity ?? 0,
      poPrice: poLine?.unitPrice,
      invoicePrice: invoiceLine?.unitPrice,
      quantityVariance: invoiceLine ? (invoiceLine.quantity ?? 0) - (grnLine?.quantity ?? 0) : null,
      priceVariance:
        invoiceLine?.unitPrice !== null && invoiceLine?.unitPrice !== undefined && poLine?.unitPrice !== null && poLine?.unitPrice !== undefined
          ? (invoiceLine.unitPrice ?? 0) - (poLine.unitPrice ?? 0)
          : null,
      hasPOLine: Boolean(poLine),
      hasGRNLine: Boolean(grnLine),
      hasInvoiceLine: Boolean(invoiceLine),
      identityStatus,
      quantityStatus,
      priceStatus,
      issues,
      status: issues.length === 0 ? MATCHED : DISCREPANCY,
      conditionLabel: invoiceLine?.spec?.condition || poLine?.spec?.condition || grnLine?.spec?.condition || "Unknown Condition",
      poSpecSummary: buildSpecSummary(poLine?.spec || {}),
      grnSpecSummary: buildSpecSummary(grnLine?.spec || {}),
      invoiceSpecSummary: buildSpecSummary(invoiceLine?.spec || {}),
      grnAmount: poLine?.unitPrice === null || poLine?.unitPrice === undefined ? null : (poLine?.unitPrice || 0) * (grnLine?.quantity || 0),
    });
  });

  lines.sort((left, right) => left.label.localeCompare(right.label));

  return {
    lines,
    failedLineCount: lines.filter((line) => line.status === DISCREPANCY).length,
  };
};

export const buildMatchRecords = ({
  purchaseOrders,
  deliveryReceipts,
  goodsReceipts,
  suppliers,
  productMasters,
  productVariants,
}) => {
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const productMasterMap = new Map(productMasters.map((product) => [product.id, product]));
  const productVariantMap = new Map(productVariants.map((variant) => [variant.id, variant]));

  return purchaseOrders.map((po) => {
    const linkedReceipts = deliveryReceipts.filter((receipt) => receipt.po_id === po.id);
    const { record: invoiceRecord, additionalCount: additionalInvoiceCount } = getLatestLinkedRecord(linkedReceipts);
    const linkedGRNs = invoiceRecord ? goodsReceipts.filter((grn) => getGRNLinkedDrId(grn) === invoiceRecord.id) : [];
    const { record: goodsReceipt, additionalCount: additionalGRNCount } = getLatestLinkedRecord(linkedGRNs);

    const poLineMap = createPOLineMap(po, productMasterMap);
    const invoiceLineMap = createInvoiceLineMap(invoiceRecord, productMasterMap);
    const grnLineMap = createGRNLineMap(goodsReceipt, productMasterMap, productVariantMap);
    const comparison = buildComparisonLines(poLineMap, invoiceLineMap, grnLineMap);

    const supplier = supplierMap.get(po.supplier_id);
    const documentWarnings = [];

    if (additionalInvoiceCount > 0) {
      documentWarnings.push(`Using the latest delivery receipt. ${additionalInvoiceCount} older linked invoice record(s) also exist.`);
    }
    if (additionalGRNCount > 0) {
      documentWarnings.push(`Using the latest goods receipt. ${additionalGRNCount} older linked GRN record(s) also exist.`);
    }
    if (!invoiceRecord) {
      documentWarnings.push("Waiting for the billed document (delivery receipt) to be linked to this PO.");
    }
    if (invoiceRecord && !goodsReceipt) {
      documentWarnings.push("Waiting for a goods receipt to confirm what was actually received.");
    }

    const poSubtotal = Number(po.financials_json?.subtotal) || 0;
    const poTotal = Number(po.financials_json?.total_amount) || 0;
    const invoiceTotal =
      Number(invoiceRecord?.declared_items_json?.dr_value) ||
      Array.from(invoiceLineMap.values()).reduce((sum, line) => sum + (line.amount || 0), 0);
    const hasTotalWarning = Boolean(invoiceRecord) && !areAmountsEqual(poSubtotal, invoiceTotal);

    let status = MATCHED;
    if (!invoiceRecord || !goodsReceipt) {
      status = PENDING;
    } else if (comparison.failedLineCount > 0) {
      status = DISCREPANCY;
    }

    const payable = po.payable_json || {};
    const paymentState = payable?.has_paid ? "paid" : status === MATCHED ? "ready" : "blocked";

    return {
      id: po.id,
      po,
      supplierName: getSupplierName(supplier),
      invoiceRecord,
      goodsReceipt,
      lines: comparison.lines,
      discrepancyCount: comparison.failedLineCount,
      documentWarnings,
      status,
      canMarkAsPaid: status === MATCHED,
      paymentState,
      payable,
      isPaid: Boolean(payable?.has_paid),
      totals: {
        poSubtotal,
        poTotal,
        invoiceTotal,
        hasTotalWarning,
        delta: invoiceTotal - poSubtotal,
      },
    };
  });
};
