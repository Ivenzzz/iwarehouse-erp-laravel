import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function SalesProfitTrackerTable({
  rows,
  pagination,
  search,
  onSearchChange,
  onPageChange,
}) {
  const page = pagination?.page || 1;
  const perPage = pagination?.per_page || 15;
  const total = pagination?.total || 0;
  const lastPage = pagination?.last_page || 1;

  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" /> Transaction Details ({total})
          </CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No transactions found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Txn #</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Branch</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Cost</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Gross Profit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">MDR</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Net Profit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400 text-xs">{row.transactionNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.transactionDate ? format(new Date(row.transactionDate), "MMM dd, yyyy HH:mm") : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">{row.warehouseName || "-"}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-foreground">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3 text-xs text-right text-muted-foreground">{formatCurrency(row.cost)}</td>
                      <td className={`px-4 py-3 text-xs text-right font-medium ${row.grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(row.grossProfit)}
                      </td>
                      <td className="px-4 py-3 text-xs text-left">
                        <div className="flex flex-col gap-0.5">
                          {row.mdrDetails.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : row.mdrDetails.map((detail, index) => (
                            <span key={`${row.id}-${index}`} className={detail.is_credit_card ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                              {detail.is_credit_card
                                ? `${detail.rate}% • ${[detail.bank, detail.method].filter(Boolean).join(" ")} • ${detail.loan_term_months}mo • -${formatCurrency(detail.deduction)}`
                                : detail.method}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-xs text-right font-medium ${row.netProfit >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(row.netProfit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge className={`text-xs ${row.netMargin >= 20 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : row.netMargin >= 10 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {Number(row.netMargin || 0).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lastPage > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
