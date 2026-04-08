const INVENTORY_TIME_ZONE = "Asia/Manila";
const HAS_TIME_ZONE_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;

const parseInventoryDate = (dateString) => {
  if (!dateString) return null;

  const normalized = String(dateString).trim();
  if (!normalized) return null;

  const safeDateString = HAS_TIME_ZONE_SUFFIX.test(normalized)
    ? normalized
    : `${normalized}Z`;

  const date = new Date(safeDateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getZonedDateParts = (dateString) => {
  const date = dateString instanceof Date ? dateString : parseInventoryDate(dateString);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: INVENTORY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
    second: Number(getPart("second")),
  };
};

const getZonedTimestamp = (dateString) => {
  const parts = getZonedDateParts(dateString);
  if (!parts) return null;

  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
};

export const getStatusColor = (status) => {
  const colors = {
    available: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
    active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
    reserved: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
    reserved_for_transfer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
    sold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
    sold_as_replacement: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
    on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
    for_branch_transfer: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
    in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
    qc_pending: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
    rma: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    damaged: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    stolen_lost: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    for_return_to_supplier: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
    scrap: "bg-gray-100 text-gray-800 dark:bg-slate-700/60 dark:text-slate-300",
    bundled: "bg-gray-100 text-gray-800 dark:bg-slate-700/60 dark:text-slate-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export const formatCurrency = (value) => {
  if (!value) return "P0.00";
  return `P${Number(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString) => {
  const date = parseInventoryDate(dateString);
  if (!date) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: INVENTORY_TIME_ZONE,
  });
};

export const formatDateTime = (dateString) => {
  const date = parseInventoryDate(dateString);
  if (!date) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: INVENTORY_TIME_ZONE,
  });
};

export const calculateStockAge = (encodedDate) => {
  if (!encodedDate) return "N/A";

  const encodedTs = getZonedTimestamp(encodedDate);
  const nowTs = getZonedTimestamp(new Date());
  if (encodedTs === null || nowTs === null) return "N/A";

  const diffTime = Math.abs(nowTs - encodedTs);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";
  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year" : `${years} years`;
};

export const getStockAgeColor = (encodedDate) => {
  if (!encodedDate) return "text-slate-500";

  const encodedTs = getZonedTimestamp(encodedDate);
  const nowTs = getZonedTimestamp(new Date());
  if (encodedTs === null || nowTs === null) return "text-slate-500";

  const diffDays = Math.floor(Math.abs(nowTs - encodedTs) / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return "text-green-600 dark:text-green-400";
  if (diffDays < 90) return "text-yellow-600 dark:text-yellow-400";
  if (diffDays < 180) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};
