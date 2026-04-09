import axios from "axios";
import { addHours, differenceInDays, differenceInMinutes, format, isAfter, parseISO } from "date-fns";

export const getSourceLocationId = (transfer) => {
  return transfer.source_location_id;
};

export const getDestinationLocationId = (transfer) => {
  return transfer.destination_location_id;
};

export const getTransferDate = (transfer, field) => {
  return transfer.dates_json?.[field] || transfer[field];
};

const parseTransferTimestamp = (dateStr) => {
  if (!dateStr) return null;

  const normalizedDateStr =
    typeof dateStr === "string" && !/[zZ]|[+-]\d{2}:\d{2}$/.test(dateStr)
      ? `${dateStr}Z`
      : dateStr;

  const date = new Date(normalizedDateStr);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTransferLocalDate = (dateStr) => {
  const date = parseTransferTimestamp(dateStr);
  if (!date) return "N/A";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatTransferLocalTime = (dateStr) => {
  const date = parseTransferTimestamp(dateStr);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const formatTransferLocalDateTime = (dateStr) => {
  const date = parseTransferTimestamp(dateStr);
  if (!date) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const getActorId = (transfer, role) => {
  if (transfer.actors_json?.[role] !== undefined) return transfer.actors_json[role];
  const normalizedRole = role.endsWith("_id") ? role : `${role}_id`;
  return transfer.actors_json?.[normalizedRole] || transfer[normalizedRole];
};

export const getWarehouseName = (warehouseId, warehouses) => {
  return warehouses.find((w) => w.id === warehouseId)?.name || "N/A";
};

export const getUserName = (userId, users) => {
  if (!userId) return "N/A";
  const user = users.find((u) => u.id === userId || u.email === userId);
  return user?.full_name || user?.email || userId;
};

export const getActorName = (transfer, role, users = []) => {
  const normalizedRole = role.endsWith("_name") ? role : `${role}_name`;
  const baseRole = role.replace(/_name$/, "");
  return (
    transfer?.actors_json?.[normalizedRole] ||
    (baseRole === "created_by" ? transfer?.created_by?.full_name : null) ||
    getUserName(getActorId(transfer, baseRole), users)
  );
};

export const calculateTransitTime = (transfer) => {
  const startDate = getTransferDate(transfer, "shipped_date") || getTransferDate(transfer, "created_date");
  const receivedDate = getTransferDate(transfer, "received_date");
  
  if (!startDate || !receivedDate) return null;

  return calculateDuration(startDate, receivedDate);
};

// --- NEW FUNCTION: Generic Duration Calculator ---
export const calculateDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return null;

  const start = parseTransferTimestamp(startStr);
  const end = parseTransferTimestamp(endStr);

  if (!start || !end) return null;
  
  // Ensure we don't calculate negative time
  if (start > end) return null;

  const totalMinutes = differenceInMinutes(end, start);

  if (totalMinutes < 1) return "< 1m";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ");
};

// --- NEW FUNCTION: Total Lifecycle Time ---
export const calculateTotalDuration = (transfer) => {
  const createdDate = getTransferDate(transfer, "created_date");
  if (!createdDate) return null;

  const receivedDate = getTransferDate(transfer, 'received_date');

  if (receivedDate) {
    return calculateDuration(createdDate, receivedDate);
  }

  return calculateDuration(createdDate, new Date().toISOString());
};

// --- NEW HELPER: Boolean check for Overdue ---
export const isTransferOverdue = (transfer) => {
  if (transfer.status !== "shipped") return false;
  const sentDateStr = getTransferDate(transfer, "shipped_date");
  if (!sentDateStr) return false;
  const sentDate = parseISO(sentDateStr);
  const limitDate = addHours(sentDate, 24);
  const now = new Date();
  return isAfter(now, limitDate);
};

export const calculateOverdueDuration = (transfer) => {
  if (!isTransferOverdue(transfer)) return null;

  const sentDateStr = getTransferDate(transfer, "shipped_date");
  const sentDate = new Date(sentDateStr);
  const limitDate = addHours(sentDate, 24); // Limit is 24 hours after sent
  const now = new Date();

  return calculateDuration(limitDate.toISOString(), now.toISOString());
};

export const calculateArrivalTime = (transfer) => {
  const receivedDate = getTransferDate(transfer, "received_date");
  if (!receivedDate) return "N/A";
  try {
    const end = parseISO(receivedDate);
    return format(end, "MMM dd, yyyy h:mm a");
  } catch (error) {
    return "N/A";
  }
};

export const calculateStockAge = (encodedDate) => {
  if (!encodedDate) return 0;
  try {
    const encoded = new Date(encodedDate);
    const today = new Date();
    return Math.max(0, differenceInDays(today, encoded));
  } catch (error) {
    return 0;
  }
};

export const getItemStatus = (inventoryId, inventory, salesTransactions) => {
  const invItem = inventory.find((i) => i.id === inventoryId);
  if (!invItem) return "Unknown";

  const isSold = salesTransactions.some((tx) =>
    tx.items?.some((item) => item.inventory_id === inventoryId)
  );

  if (isSold) return "Sold";
  return invItem.status || "Unknown";
};

export const resolveTransferItemInventoryItem = (item, inventory = []) => {
  if (!item?.inventory_id) return null;
  return inventory.find((entry) => entry.id === item.inventory_id) || null;
};

export const getTransferLineDisplayName = (line, inventory = [], variants = []) => {
  if (line?.variant_name) return line.variant_name;
  if (line?.product_name) return line.product_name;
  const inventoryItem = resolveTransferItemInventoryItem(line, inventory);
  const variant = variants.find((entry) => entry.id === inventoryItem?.variant_id);
  return variant?.variant_name || inventoryItem?.productName || inventoryItem?.product_name || "Unknown Item";
};

export const getTransferLineIdentifier = (line, inventory = []) => {
  if (line?.identifier) return line.identifier;
  if (line?.imei1) return line.imei1;
  if (line?.imei2) return line.imei2;
  if (line?.serial_number) return line.serial_number;
  const inventoryItem = resolveTransferItemInventoryItem(line, inventory);
  if (!inventoryItem) {
    return "Unknown Identifier";
  }

  return (
    inventoryItem.imei1 ||
    inventoryItem.imei2 ||
    inventoryItem.serial_number ||
    inventoryItem.id ||
    "Unknown Identifier"
  );
};

export const getTransferTotalItems = (transfer) => {
  return transfer?.summary?.total_items ?? (transfer.product_lines || []).length;
};

export const getTransferTotalCost = (transfer, inventory) => {
  if (typeof transfer?.summary?.total_cost === "number") {
    return transfer.summary.total_cost;
  }

  return (transfer.product_lines || []).reduce(
    (total, line) => total + getProductLineCost(line, inventory, getSourceLocationId(transfer)),
    0
  );
};

export const getProductLineCost = (line, inventory = [], sourceLocationId = null) => {
  if (line?.cost_price != null) {
    return Number(line.cost_price || 0);
  }

  const inventoryItem = resolveTransferItemInventoryItem(line, inventory);
  return Number(inventoryItem?.cost_price || 0);
};

export const resolveTransferItems = (transfer, inventory = [], variants = []) => {
  const inventoryMap = new Map((inventory || []).map((item) => [item.id, item]));
  const variantMap = new Map((variants || []).map((item) => [item.id, item]));

  return (transfer?.product_lines || []).map((item, index) => {
    const inventoryItem = inventoryMap.get(item.inventory_id);
    const variant = inventoryItem?.variant_id ? variantMap.get(inventoryItem.variant_id) : null;

    return {
      key: item.inventory_id || `transfer-item-${index}`,
      inventory_id: item.inventory_id,
      is_picked: Boolean(item.is_picked),
      is_shipped: Boolean(item.is_shipped),
      is_received: Boolean(item.is_received),
      variant_id: item.variant_id || inventoryItem?.variant_id || null,
      variant_name: item.variant_name || variant?.variant_name || inventoryItem?.variant_name || "Unknown Variant",
      product_name: item.product_name || inventoryItem?.product_name || inventoryItem?.productName || "Unknown Product",
      brand_name: item.brand_name || inventoryItem?.brandName || "",
      identifier:
        item.identifier ||
        item.imei1 ||
        item.imei2 ||
        item.serial_number ||
        inventoryItem?.imei1 ||
        inventoryItem?.imei2 ||
        inventoryItem?.serial_number ||
        item.inventory_id ||
        "Unknown Identifier",
      cost_price: Number(item.cost_price ?? (inventoryItem?.cost_price || 0)),
      inventory_item: inventoryItem || null,
    };
  });
};

export const formatPhp = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(route("stock-transfers.upload-proof"), formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
