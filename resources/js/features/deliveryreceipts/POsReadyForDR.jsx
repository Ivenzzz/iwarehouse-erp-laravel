import React, { useMemo, useCallback, startTransition, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2,
  Search,
  RefreshCcw,
  Plus,
  AlertCircle,
  Package,
  Banknote,
  CalendarClock,
  Upload,
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import POTableRow from "./POTableRow";

const ROW_HEIGHT = 73;
const TABLE_HEIGHT = 640;

export default function POsReadyForDR({
  purchaseOrders,
  purchaseOrdersTotal,
  currentPage,
  pageSize,
  hasMorePages,
  isFetchingMore = false,
  searchValue,
  filterTime,
  filterWarehouse,
  onSearchChange,
  onFilterTimeChange,
  onFilterWarehouseChange,
  onPageChange,
  productMasters,
  warehouses,
  onSelectPO,
  onManualCreate,
  onRefresh,
  metrics,
}) {
  const parentRef = useRef(null);
  const lastRequestedPageRef = useRef(currentPage);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    startTransition(() => {
      onSearchChange(val);
    });
  }, [onSearchChange]);

  const rowVirtualizer = useVirtualizer({
    count: purchaseOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const topPaddingHeight = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const bottomPaddingHeight =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  useEffect(() => {
    lastRequestedPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
    rowVirtualizer.scrollToOffset(0);
    lastRequestedPageRef.current = 1;
  }, [searchValue, filterTime, filterWarehouse, rowVirtualizer]);

  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem || !hasMorePages || isFetchingMore) {
      return;
    }

    const nextPage = currentPage + 1;
    if (lastItem.index >= purchaseOrders.length - 5 && lastRequestedPageRef.current < nextPage) {
      lastRequestedPageRef.current = nextPage;
      onPageChange(nextPage);
    }
  }, [currentPage, hasMorePages, isFetchingMore, onPageChange, purchaseOrders.length, virtualRows]);

  const localMetrics = useMemo(() => {
    const today = new Date();
    let overdueCount = 0;
    let totalValue = 0;

    purchaseOrders.forEach((po) => {
      const cost = po.financials_json?.total_amount || po.total_amount || 0;
      totalValue += cost;

      if (po.expected_delivery_date) {
        if (differenceInCalendarDays(new Date(po.expected_delivery_date), today) < 0) overdueCount++;
      }
    });

    return {
      count: purchaseOrders.length,
      overdue: overdueCount,
      value: totalValue,
    };
  }, [purchaseOrders]);
  const effectiveMetrics = metrics || localMetrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ready to Receive</p>
              <h3 className="text-2xl font-bold text-card-foreground">
                {effectiveMetrics.count} <span className="text-sm font-normal text-muted-foreground">Orders</span>
              </h3>
            </div>
            <div className="rounded-full border border-primary/25 bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue Shipments</p>
              <h3 className="text-2xl font-bold text-info">
                {effectiveMetrics.overdue} <span className="text-sm font-normal text-muted-foreground">Orders</span>
              </h3>
            </div>
            <div className="rounded-full border border-info/25 bg-info/10 p-3">
              <AlertCircle className="h-6 w-6 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Incoming Value</p>
              <h3 className="text-2xl font-bold text-card-foreground">
                PHP {effectiveMetrics.value.toLocaleString("en-PH", { notation: "compact" })}
              </h3>
            </div>
            <div className="rounded-full border border-success/25 bg-success/10 p-3">
              <Banknote className="h-6 w-6 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="border-b border-border pb-2">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-card-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Incoming Purchase Orders
            </CardTitle>

            <div className="flex w-full gap-2 md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                title="Refresh Data"
                className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-2 border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Upload className="h-4 w-4 text-info" /> Import CSV
              </Button>

              <Button
                onClick={onManualCreate}
                size="sm"
                className="gap-2 border border-primary/20 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" /> Log Manual DR
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by PO#..."
                value={searchValue}
                onChange={handleSearchChange}
                className="border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              <div className="w-[180px]">
                <Select value={filterTime} onValueChange={onFilterTimeChange}>
                  <SelectTrigger className="border-input bg-background text-foreground focus:ring-2 focus:ring-ring">
                    <SelectValue placeholder="Delivery Time" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="all" className="focus:bg-accent focus:text-accent-foreground">
                      Time: All
                    </SelectItem>
                    <SelectItem value="this_week" className="focus:bg-accent focus:text-accent-foreground">
                      Time: This Week
                    </SelectItem>
                    <SelectItem value="overdue" className="focus:bg-accent focus:text-accent-foreground">
                      Time: Overdue
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px]">
                <Select value={filterWarehouse} onValueChange={onFilterWarehouseChange}>
                  <SelectTrigger className="border-input bg-background text-foreground focus:ring-2 focus:ring-ring">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="all" className="focus:bg-accent focus:text-accent-foreground">
                      Warehouse: All
                    </SelectItem>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="focus:bg-accent focus:text-accent-foreground">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div ref={parentRef} className="overflow-auto" style={{ height: `${TABLE_HEIGHT}px` }}>
              <table className="w-full min-w-[1200px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Units
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Expected Delivery
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <CalendarClock className="mb-2 h-10 w-10 text-muted-foreground/40" />
                          <p>No approved purchase orders found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {topPaddingHeight > 0 && (
                        <tr>
                          <td colSpan="7" style={{ height: `${topPaddingHeight}px`, padding: 0 }} />
                        </tr>
                      )}

                      {virtualRows.map((virtualRow) => {
                        const po = purchaseOrders[virtualRow.index];

                        return (
                          <POTableRow
                            key={po.id}
                            po={po}
                            productMasters={productMasters}
                            onSelectPO={onSelectPO}
                          />
                        );
                      })}

                      {bottomPaddingHeight > 0 && (
                        <tr>
                          <td colSpan="7" style={{ height: `${bottomPaddingHeight}px`, padding: 0 }} />
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              {purchaseOrders.length === 0
                ? "Showing 0 orders"
                : `Showing 1 to ${purchaseOrders.length} of ${
                    typeof purchaseOrdersTotal === "number" ? purchaseOrdersTotal : `${purchaseOrders.length}${hasMorePages ? "+" : ""}`
                  } orders`}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isFetchingMore ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  <span>Loading more orders...</span>
                </>
              ) : hasMorePages ? (
                <span>Scroll to load more</span>
              ) : (
                <span>All matching orders loaded</span>
              )}
              {pageSize > 0 && <span className="text-xs">Page size: {pageSize}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
