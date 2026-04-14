import React, { useMemo, useCallback, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Truck,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  PackageCheck,
  Banknote,
  Download,
} from "lucide-react";
import DRTableRow from "./DRTableRow";

export default function DRTable({
  deliveryReceipts,
  deliveryReceiptsTotal,
  currentPage,
  pageSize,
  hasMorePages,
  searchValue,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onViewDetails,
  onViewPhotos,
  onViewHistory,
  metrics,
}) {
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    startTransition(() => {
      onSearchChange(val);
    });
  }, [onSearchChange]);

  const localMetrics = useMemo(() => {
    const totalValue = deliveryReceipts.reduce((sum, dr) => {
      const declared = dr.declared_items_json || {};
      return sum + (declared.total_landed_cost || dr.total_landed_cost || 0);
    }, 0);

    const pendingCount = deliveryReceipts.filter((dr) =>
      ["ready_for_warehouse", "warehouse_encoding"].includes(dr.status)
    ).length;

    return {
      count: deliveryReceipts.length,
      value: totalValue,
      pending: pendingCount,
    };
  }, [deliveryReceipts]);
  const effectiveMetrics = metrics || localMetrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Receipts</p>
              <h3 className="text-2xl font-bold text-card-foreground">{effectiveMetrics.count}</h3>
            </div>
            <div className="rounded-full border border-primary/25 bg-primary/10 p-3">
              <Truck className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Warehouse</p>
              <h3 className="text-2xl font-bold text-info">{effectiveMetrics.pending}</h3>
            </div>
            <div className="rounded-full border border-info/25 bg-info/10 p-3">
              <PackageCheck className="h-6 w-6 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value (Filtered)</p>
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
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <Truck className="h-5 w-5 text-primary" />
              Receipt History
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by DR#..."
                value={searchValue}
                onChange={handleSearchChange}
                className="border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="w-[200px]">
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="border-input bg-background text-foreground focus:ring-2 focus:ring-ring">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>

                <SelectContent className="border-border bg-popover text-popover-foreground">
                  <SelectItem value="all" className="text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                    Status: All
                  </SelectItem>
                  <SelectItem
                    value="ready_for_warehouse"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Ready for Warehouse
                  </SelectItem>
                  <SelectItem
                    value="warehouse_encoding"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Encoding
                  </SelectItem>
                  <SelectItem
                    value="completed"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Completed
                  </SelectItem>
                  <SelectItem
                    value="with_variance"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    With Variance
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = route("delivery-receipts.export", route().params)}
              className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <table className="w-full min-w-[1200px]">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    DR Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Encoded By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date Received
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Landed Cost
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {deliveryReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <PackageCheck className="mb-2 h-12 w-12 text-muted-foreground/40" />
                        <p>No delivery receipts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  deliveryReceipts.map((dr) => (
                    <DRTableRow
                      key={dr.id}
                      dr={dr}
                      onViewDetails={onViewDetails}
                      onViewPhotos={onViewPhotos}
                      onViewHistory={onViewHistory}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(currentPage > 1 || hasMorePages) && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {deliveryReceipts.length === 0
                  ? "Showing 0 entries"
                  : `Showing ${(currentPage - 1) * pageSize + 1} to ${(currentPage - 1) * pageSize + deliveryReceipts.length} of ${
                      typeof deliveryReceiptsTotal === "number" ? deliveryReceiptsTotal : `${currentPage}${hasMorePages ? "+" : ""}`
                    } entries`}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="text-sm font-medium text-foreground">
                  Page {currentPage}
                  {typeof deliveryReceiptsTotal === "number" ? ` of ${Math.max(Math.ceil(deliveryReceiptsTotal / pageSize), 1)}` : ""}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={!hasMorePages}
                  className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
