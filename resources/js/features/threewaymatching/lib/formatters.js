export const formatMoney = (value) =>
  `PHP ${(Number(value) || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (value, options = { month: "short", day: "2-digit", year: "numeric" }) => {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-PH", options);
};

export const formatDateTime = (value) =>
  formatDate(value, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatQuantity = (value) => {
  const quantity = Number(value) || 0;
  if (Number.isInteger(quantity)) {
    return quantity.toLocaleString("en-PH");
  }

  return quantity.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
