import { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Combobox } from "@/shared/components/ui/combobox";
import AppShell from "@/shared/layouts/AppShell";
import SalesTableRow from "@/features/sales/SalesTableRow";
import TransactionDetailsDialog from "@/features/salesreport/TransactionDetailsDialog";
import { usePageToasts } from "@/shared/hooks/use-page-toasts";
import { Search, Package, RefreshCw, Calendar as CalendarIcon, X, ChevronUp, ChevronDown, Download, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { format, getISOWeek, getYear, startOfISOWeek, endOfISOWeek, subWeeks } from "date-fns";
import { generateWarrantyReceiptHTML } from "@/features/pos/lib/services/sale/warrantyReceiptService";

const Skeleton = ({ className }) => <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className || ""}`} />;
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

function generateWeekOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = subWeeks(now, i);
    const weekNum = getISOWeek(d);
    const year = getYear(startOfISOWeek(d));
    const weekStart = startOfISOWeek(d);
    const weekEnd = endOfISOWeek(d);
    options.push({ value: `${year}-W${weekNum}`, label: `W${weekNum} (${format(weekStart, "MMM dd")} - ${format(weekEnd, "MMM dd, yyyy")})` });
  }
  return options;
}

function SortableHeader({ label, sortKey, filters, onSort }) {
  const active = filters.sort === sortKey;
  return (
    <th className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? (filters.direction === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </div>
    </th>
  );
}

export default function Sales({ filters, warehouses, rows }) {
  const { props } = usePage();
  usePageToasts([props.errors?.file], "destructive");

  const [searchTerm, setSearchTerm] = useState(filters.search ?? "");
  const [selectedDay, setSelectedDay] = useState(filters.day ? new Date(`${filters.day}T00:00:00`) : null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingTransactions, setIsImportingTransactions] = useState(false);
  const fileInputRef = useRef(null);
  const transactionsFileInputRef = useRef(null);
  const weekOptions = useMemo(() => [{ value: "all", label: "All Weeks" }, ...generateWeekOptions()], []);
  const warehouseOptions = useMemo(() => [{ value: "all", label: "All Branches" }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))], [warehouses]);
  const visibleRows = rows?.data ?? [];
  const pagination = useMemo(() => ({
    currentPage: rows?.current_page ?? 1,
    from: rows?.from ?? 0,
    lastPage: rows?.last_page ?? 1,
    perPage: rows?.per_page ?? filters.perPage ?? 25,
    to: rows?.to ?? 0,
    total: rows?.total ?? 0,
  }), [rows, filters.perPage]);

  useEffect(() => {
    setSearchTerm(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    setSelectedDay(filters.day ? new Date(`${filters.day}T00:00:00`) : null);
  }, [filters.day]);

  const visit = (params = {}) => {
    router.get(route("sales.index"), {
      ...filters,
      ...params,
    }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if ((filters.search ?? "") !== searchTerm) {
        visit({ search: searchTerm, page: undefined });
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSort = (key) => {
    visit({
      sort: key,
      direction: filters.sort === key && filters.direction === "asc" ? "desc" : "asc",
      page: undefined,
    });
  };

  const handlePrint = async (transaction) => {
    const { data } = await window.axios.get(route("sales.show", transaction.id));
    const html = generateWarrantyReceiptHTML({ transaction: data.transaction, companyInfo: [] });
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`${html}<script>window.onload=function(){window.print();}</script>`);
    printWindow.document.close();
  };

  const handleOpenImportPicker = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const handleOpenTransactionsImportPicker = () => {
    if (isImportingTransactions) return;
    transactionsFileInputRef.current?.click();
  };

  const handleImportPosSessions = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    router.post(route("sales.import.pos-sessions", filters), { file }, {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  const handleImportTransactions = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingTransactions(true);
    router.post(route("sales.import.transactions", filters), { file }, {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => {
        setIsImportingTransactions(false);
        if (transactionsFileInputRef.current) {
          transactionsFileInputRef.current.value = "";
        }
      },
    });
  };

  return (
    <AppShell title="Sales">
      <Head title="Sales" />
      <div className="min-h-screen space-y-6 bg-background p-2 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales Transactions</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Transaction management</p>
          </div>
        </div>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 border rounded-sm shadow-md">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rounded" />
                <Input placeholder="Search OR #, DR #, IMEI, serial, payment method..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-sm" />
              </div>

              <div className="w-48">
                <Combobox value={String(filters.warehouse)} onValueChange={(value) => visit({ warehouse: value || "all", page: undefined })} options={warehouseOptions} placeholder="All Branches" searchPlaceholder="Search branch..." className="justify-start rounded-sm" />
              </div>

              <div className="w-72">
                <Combobox value={filters.week || "all"} onValueChange={(value) => visit({ week: value || "all", day: "", page: undefined })} options={weekOptions} placeholder="Select Week" searchPlaceholder="Search week..." className="justify-start rounded-sm" />
              </div>  

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDay ? format(selectedDay, "MMM dd, yyyy") : "Specific Day"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-3">
                    <Input
                      type="date"
                      value={selectedDay ? format(selectedDay, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) {
                          setSelectedDay(null);
                          visit({ day: "", page: undefined });
                          return;
                        }

                        const date = new Date(`${value}T00:00:00`);
                        setSelectedDay(date);
                        visit({ day: value, week: "all", page: undefined });
                      }}
                    />
                    {selectedDay ? <div className="border-t pt-2"><Button variant="ghost" size="sm" onClick={() => { setSelectedDay(null); visit({ day: "", page: undefined }); }} className="w-full justify-start"><X className="mr-2 h-4 w-4" />Clear Day Filter</Button></div> : null}
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" onClick={() => router.reload({ only: ["filters", "warehouses", "rows"], preserveScroll: true, preserveState: true })}>
                <RefreshCw className="mr-2 h-4 w-4" />Refresh
              </Button>

              <Button variant="outline" onClick={() => { window.location.href = route("sales.export.xlsx", filters); }} disabled={pagination.total === 0}>
                <Download className="mr-2 h-4 w-4" />Export XLSX
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleImportPosSessions}
              />
              <Button variant="outline" onClick={handleOpenImportPicker} disabled={isImporting}>
                <Upload className="mr-2 h-4 w-4" />{isImporting ? "Importing..." : "Import POS Sessions"}
              </Button>

              <input
                ref={transactionsFileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleImportTransactions}
              />
              <Button variant="outline" onClick={handleOpenTransactionsImportPicker} disabled={isImportingTransactions}>
                <Upload className="mr-2 h-4 w-4" />{isImportingTransactions ? "Importing..." : "Import Sales Transactions"}
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-b-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <tr>
                    <SortableHeader label="DR Number" sortKey="transaction_number" filters={filters} onSort={handleSort} />
                    <SortableHeader label="OR Number" sortKey="or_number" filters={filters} onSort={handleSort} />
                    <SortableHeader label="Date/Time" sortKey="transaction_date" filters={filters} onSort={handleSort} />
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Branch</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Customer</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Sales Representative</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Payment Methods</th>
                    <SortableHeader label="Amount" sortKey="total_amount" filters={filters} onSort={handleSort} />
                    <th className="px-3 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows ? [...Array(5)].map((_, i) => <tr key={i} className="border-b border-slate-100">{[...Array(9)].map((__, j) => <td key={j} className="px-3 py-4"><Skeleton className="h-4 w-full" /></td>)}</tr>) : visibleRows.length > 0 ? visibleRows.map((transaction) => (
                    <SalesTableRow
                      key={transaction.id}
                      transaction={transaction}
                      customerName={transaction.customer_name}
                      salesRepName={transaction.sales_representative_name}
                      warehouseName={transaction.warehouse_name}
                      onView={(t) => { setSelectedTransactionId(t.id); setShowDetailsDialog(true); }}
                      onPrint={handlePrint}
                    />
                  )) : (
                    <tr><td colSpan={9} className="py-12 text-center text-slate-500"><div className="flex flex-col items-center gap-2"><Package className="h-12 w-12 text-slate-300" /><p className="font-medium text-slate-700">No transactions found</p><p className="text-xs text-slate-500">Try adjusting your filters</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing {pagination.from ?? 0} to {pagination.to ?? 0} of {pagination.total ?? 0} transaction(s)
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={String(pagination.perPage)}
                  onChange={(event) => visit({ perPage: Number(event.target.value), page: undefined })}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option} / page</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1} onClick={() => visit({ page: pagination.currentPage - 1 })}>
                  Previous
                </Button>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Page {pagination.currentPage} of {pagination.lastPage}
                </div>
                <Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.lastPage} onClick={() => visit({ page: pagination.currentPage + 1 })}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TransactionDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          transactionId={selectedTransactionId}
          endpoint={selectedTransactionId ? route("sales.show", selectedTransactionId) : null}
        />
      </div>
    </AppShell>
  );
}
