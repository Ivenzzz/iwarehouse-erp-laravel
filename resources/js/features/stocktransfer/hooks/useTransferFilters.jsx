import { useMemo, useState } from "react";
import {
  getActorName,
  getDestinationLocationId,
  getSourceLocationId,
  getTransferDate,
  getTransferTotalItems,
  isTransferOverdue,
} from "../services/transferService";

const FILTERABLE_STATUSES = [
  "draft",
  "picked",
  "shipped",
  "partially_received",
  "fully_received",
  "consolidated",
];

const matchesStatusFilter = (transfer, statusFilter) => {
  if (statusFilter === "all") {
    return true;
  }

  if (statusFilter === "past_due") {
    return isTransferOverdue(transfer);
  }

  if (statusFilter === "in_transit") {
    return transfer.status === "shipped" && !isTransferOverdue(transfer);
  }

  if (statusFilter === "to_ship") {
    return transfer.status === "picked";
  }

  if (FILTERABLE_STATUSES.includes(statusFilter)) {
    return transfer.status === statusFilter;
  }

  return transfer.status === statusFilter;
};

const matchesDateRangeFilter = ({
  transfer,
  dateRangeFilter,
  customDateFrom,
  customDateTo,
}) => {
  if (dateRangeFilter === "all") {
    return true;
  }

  const transferDate = getTransferDate(transfer, "created_date");
  if (!transferDate) {
    return false;
  }

  const parsedTransferDate = new Date(transferDate);
  if (Number.isNaN(parsedTransferDate.getTime())) {
    return false;
  }

  const now = new Date();

  switch (dateRangeFilter) {
    case "today":
      return parsedTransferDate.toDateString() === now.toDateString();
    case "this_week": {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return parsedTransferDate >= weekAgo;
    }
    case "this_month":
      return (
        parsedTransferDate.getMonth() === now.getMonth() &&
        parsedTransferDate.getFullYear() === now.getFullYear()
      );
    case "custom": {
      if (!customDateFrom || !customDateTo) {
        return true;
      }

      const from = new Date(customDateFrom);
      const to = new Date(customDateTo);
      return parsedTransferDate >= from && parsedTransferDate <= to;
    }
    default:
      return true;
  }
};

export const matchesTransferFilters = ({
  transfer,
  searchTerm,
  statusFilter,
  operationTypeFilter,
  fromLocationFilter,
  toLocationFilter,
  dateRangeFilter,
  customDateFrom,
  customDateTo,
}) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const createdBy = getActorName(transfer, "created_by");

  const matchesSearch =
    normalizedSearch === "" ||
    transfer.transfer_number?.toLowerCase().includes(normalizedSearch) ||
    transfer.reference?.toLowerCase().includes(normalizedSearch) ||
    transfer.notes?.toLowerCase().includes(normalizedSearch) ||
    createdBy?.toLowerCase?.().includes(normalizedSearch);

  const matchesStatus = matchesStatusFilter(transfer, statusFilter);
  const matchesOperationType =
    operationTypeFilter === "all" || transfer.operation_type === operationTypeFilter;
  const matchesFromLocation =
    fromLocationFilter === "all" || String(getSourceLocationId(transfer)) === String(fromLocationFilter);
  const matchesToLocation =
    toLocationFilter === "all" || String(getDestinationLocationId(transfer)) === String(toLocationFilter);
  const matchesDateRange = matchesDateRangeFilter({
    transfer,
    dateRangeFilter,
    customDateFrom,
    customDateTo,
  });

  return (
    matchesSearch &&
    matchesStatus &&
    matchesOperationType &&
    matchesFromLocation &&
    matchesToLocation &&
    matchesDateRange
  );
};

const sortTransfers = ({ transfers, sortBy, sortOrder }) => {
  const nextTransfers = [...transfers];

  nextTransfers.sort((a, b) => {
    let aVal;
    let bVal;

    switch (sortBy) {
      case "transfer_number":
        aVal = a.transfer_number || "";
        bVal = b.transfer_number || "";
        break;
      case "items":
        aVal = getTransferTotalItems(a);
        bVal = getTransferTotalItems(b);
        break;
      case "created_by":
        aVal = getActorName(a, "created_by") || "";
        bVal = getActorName(b, "created_by") || "";
        break;
      case "transfer_date":
      case "created_date":
      default:
        aVal = getTransferDate(a, "created_date")
          ? new Date(getTransferDate(a, "created_date")).getTime()
          : 0;
        bVal = getTransferDate(b, "created_date")
          ? new Date(getTransferDate(b, "created_date")).getTime()
          : 0;
        break;
    }

    if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  return nextTransfers;
};

export function useTransferFilters(transfers, allTransfers) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [operationTypeFilter, setOperationTypeFilter] = useState("all");
  const [fromLocationFilter, setFromLocationFilter] = useState("all");
  const [toLocationFilter, setToLocationFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");

  const filterState = useMemo(
    () => ({
      searchTerm,
      statusFilter,
      operationTypeFilter,
      fromLocationFilter,
      toLocationFilter,
      dateRangeFilter,
      customDateFrom,
      customDateTo,
    }),
    [
      searchTerm,
      statusFilter,
      operationTypeFilter,
      fromLocationFilter,
      toLocationFilter,
      dateRangeFilter,
      customDateFrom,
      customDateTo,
    ]
  );

  const filteredTransfers = useMemo(() => {
    const matchedTransfers = transfers.filter((transfer) =>
      matchesTransferFilters({
        transfer,
        ...filterState,
      })
    );

    return sortTransfers({
      transfers: matchedTransfers,
      sortBy,
      sortOrder,
    });
  }, [filterState, sortBy, sortOrder, transfers]);

  const tabCounts = useMemo(() => {
    const applyNonStatusFilters = (statusValue) =>
      allTransfers.filter((transfer) =>
        matchesTransferFilters({
          transfer,
          ...filterState,
          statusFilter: statusValue,
        })
      ).length;

    return {
      all: applyNonStatusFilters("all"),
      draft: applyNonStatusFilters("draft"),
      to_ship: applyNonStatusFilters("picked"),
      in_transit: applyNonStatusFilters("in_transit"),
      past_due: applyNonStatusFilters("past_due"),
      fully_received: applyNonStatusFilters("fully_received"),
      consolidated: applyNonStatusFilters("consolidated"),
    };
  }, [allTransfers, filterState]);

  const resetKey = useMemo(
    () =>
      JSON.stringify({
        ...filterState,
        sortBy,
        sortOrder,
      }),
    [filterState, sortBy, sortOrder]
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((currentOrder) => (currentOrder === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder(column === "created_date" ? "desc" : "asc");
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    operationTypeFilter,
    setOperationTypeFilter,
    fromLocationFilter,
    setFromLocationFilter,
    toLocationFilter,
    setToLocationFilter,
    dateRangeFilter,
    setDateRangeFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    sortBy,
    sortOrder,
    filteredTransfers,
    tabCounts,
    resetKey,
    handleSort,
  };
}
