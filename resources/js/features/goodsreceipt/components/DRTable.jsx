import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const formatCurrency = (value) =>
  `P${(Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getProductLabel = (item) => {
  const spec = [
    item.product_spec?.ram,
    item.product_spec?.rom,
    item.product_spec?.condition,
  ].filter(Boolean).join(" / ");

  return {
    name: item.product_name || "Unknown Product",
    spec,
  };
};

function PendingDRRow({ dr, onSelectDR }) {
  const declaredInfo = dr.declared_items_json || {};
  const items = declaredInfo.items || [];

  const totalQty = items.reduce(
    (sum, item) => sum + (Number(item.expected_quantity) || Number(item.actual_quantity) || 0),
    0
  );
  const distinctProducts = items.length;
  const totalCost = items.reduce((sum, item) => {
    const qty = Number(item.expected_quantity) || Number(item.actual_quantity) || 0;
    const unitCost = Number(item.unit_cost) || 0;
    return sum + qty * unitCost;
  }, 0);

  const supplierName = dr.supplier_name || "Unknown Supplier";

  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="px-4 py-4 align-middle">
        <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
          {dr.dr_number || "-"}
        </span>
      </TableCell>

      <TableCell className="px-4 py-4 align-middle">
        <p className="line-clamp-1 text-sm font-semibold text-foreground" title={supplierName}>
          {supplierName}
        </p>
      </TableCell>

      <TableCell className="px-4 py-4 align-middle">
        <Popover>
          <PopoverTrigger asChild>
            <Badge className="cursor-pointer border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15">
              {totalQty} Units
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="max-w-xs border border-border bg-popover text-popover-foreground">
            <p className="mb-1 text-xs font-bold">Declared Items:</p>
            <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-3 text-xs text-popover-foreground">
              {items.slice(0, 5).map((item, idx) => {
                const display = getProductLabel(item);
                const qty = Number(item.expected_quantity) || Number(item.actual_quantity) || 0;
                return (
                  <li key={idx}>
                    <span className="text-muted-foreground">{qty}x</span>{" "}
                    {display.name}
                    {display.spec ? <span className="text-muted-foreground"> ({display.spec})</span> : null}
                  </li>
                );
              })}
              {items.length > 5 && <li className="text-muted-foreground">...and {items.length - 5} more</li>}
              {items.length === 0 && <li className="text-muted-foreground">No items</li>}
            </ul>
            {distinctProducts > 1 && (
              <p className="mt-2 text-[10px] text-muted-foreground">{distinctProducts} SKUs total</p>
            )}
          </PopoverContent>
        </Popover>
      </TableCell>

      <TableCell className="px-4 py-4 text-right">
        <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(totalCost)}</span>
      </TableCell>

      <TableCell className="px-4 py-4 text-center">
        <Button
          onClick={() => onSelectDR(dr)}
          size="sm"
          variant="success"
        >
          Add Products
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function DRTable({
  deliveryReceipts,
  loadingDRs,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectDR,
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-accent text-card-foreground shadow-sm">
      <div className="overflow-x-auto bg-background">
        <div className="">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-accent backdrop-blur">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground">DR Number</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Supplier</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Items</TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold text-muted-foreground">Total Cost</TableHead>
                  <TableHead className="px-4 py-3 text-center font-semibold text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="[&_tr:last-child]:border-b">
                {loadingDRs ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                        <span>Loading Delivery Receipts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : deliveryReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/20 py-16 text-center text-muted-foreground">
                      <Package className="mx-auto mb-3 h-12 w-12 opacity-20" />
                      <p className="font-medium text-foreground">No Pending Deliveries</p>
                      <p className="text-xs text-muted-foreground">All delivery receipts have been processed.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveryReceipts.map((dr) => (
                    <PendingDRRow key={dr.id} dr={dr} onSelectDR={onSelectDR} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {(hasNextPage || isFetchingNextPage) && (
            <div className="flex items-center justify-center border-t border-border bg-background px-4 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoadMore?.()}
                disabled={!hasNextPage || isFetchingNextPage}
                className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronDown className="mr-2 h-4 w-4" />
                {isFetchingNextPage ? "Loading more..." : hasNextPage ? "Load more" : "All loaded"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
