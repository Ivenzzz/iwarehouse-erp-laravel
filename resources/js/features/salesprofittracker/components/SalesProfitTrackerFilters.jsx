import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, addWeeks, addYears, endOfDay, endOfMonth, endOfWeek, endOfYear, format, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function getDateRange(period, referenceDate) {
  switch (period) {
    case "daily":
      return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    case "weekly":
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
      };
    case "yearly":
      return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
    default:
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }
}

function stepDate(referenceDate, period, direction) {
  const sign = direction === "prev" ? -1 : 1;

  switch (period) {
    case "daily":
      return addDays(referenceDate, sign);
    case "weekly":
      return addWeeks(referenceDate, sign);
    case "yearly":
      return addYears(referenceDate, sign);
    default:
      return addMonths(referenceDate, sign);
  }
}

function formatRangeLabel(period, dateRange) {
  switch (period) {
    case "daily":
      return format(dateRange.start, "EEEE, MMM dd, yyyy");
    case "weekly":
      return `${format(dateRange.start, "MMM dd")} - ${format(dateRange.end, "MMM dd, yyyy")}`;
    case "monthly":
      return format(dateRange.start, "MMMM yyyy");
    case "yearly":
      return format(dateRange.start, "yyyy");
    default:
      return "";
  }
}

export default function SalesProfitTrackerFilters({
  period,
  referenceDate,
  warehouseId,
  warehouses,
  onPeriodChange,
  onWarehouseChange,
  onReferenceDateChange,
}) {
  const parsedReferenceDate = new Date(`${referenceDate}T00:00:00`);
  const dateRange = getDateRange(period, parsedReferenceDate);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-36 h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onReferenceDateChange(format(stepDate(parsedReferenceDate, period, "prev"), "yyyy-MM-dd"))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-foreground min-w-[160px] text-center">
          {formatRangeLabel(period, dateRange)}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onReferenceDateChange(format(stepDate(parsedReferenceDate, period, "next"), "yyyy-MM-dd"))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Select value={warehouseId} onValueChange={onWarehouseChange}>
        <SelectTrigger className="w-48 h-9 text-sm">
          <SelectValue placeholder="All Branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Branches</SelectItem>
          {warehouses.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
