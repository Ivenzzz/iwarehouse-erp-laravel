import { format } from "date-fns";

const MANILA_TIME_ZONE = "Asia/Manila";
const HAS_TIME_ZONE_SUFFIX = /(Z|[+-]\d{2}:\d{2})$/i;

export const parseUtcLike = (value) => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = String(value).trim();
  if (!normalized) return null;

  const safeDateString = HAS_TIME_ZONE_SUFFIX.test(normalized)
    ? normalized
    : `${normalized}Z`;

  const date = new Date(safeDateString);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getManilaDateParts = (value) => {
  const date = parseUtcLike(value);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
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

export const formatInManila = (value, pattern) => {
  const parts = getManilaDateParts(value);
  if (!parts) return null;

  const manilaClockDate = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );

  return format(manilaClockDate, pattern);
};

export const formatDateOnly = (value, pattern) => {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : format(date, pattern);
  }

  const parsed = parseUtcLike(normalized);
  if (!parsed) return null;

  return format(parsed, pattern);
};
