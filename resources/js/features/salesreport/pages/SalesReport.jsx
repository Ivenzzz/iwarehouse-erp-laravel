import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Combobox } from "@/shared/components/ui/combobox";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import TransactionDetailsDialog from "@/features/salesreport/TransactionDetailsDialog";
import { Search, Eye, ChevronLeft, ChevronRight, Download, XCircle } from "lucide-react";
import { format } from "date-fns";

const formatPHP = (amount) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount || 0);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TabButton({ active, children, onClick }) {
  return <button onClick={onClick} className={`rounded-md px-4 py-2 text-sm ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{children}</button>;
}

export default function SalesReport({ filters, warehouses, individualRows, consolidatedRows, calendar }) {
  const [activeTab, setActiveTab] = useState(filters.tab || "consolidated");
  const [sessionDetail, setSessionDetail] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [transactionDialogId, setTransactionDialogId] = useState(null);
  const [individualSearch, setIndividualSearch] = useState(filters.individual_search || "");
  const [consolidatedSearch, setConsolidatedSearch] = useState(filters.consolidated_search || "");
  const warehouseOptions = useMemo(() => [{ value: "all", label: "All Branches" }, ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))], [warehouses]);
  const statusOptions = [{ value: "all", label: "All Statuses" }, { value: "opened", label: "Opened" }, { value: "closed", label: "Closed" }];

  useEffect(() => { setActiveTab(filters.tab || "consolidated"); }, [filters.tab]);
  useEffect(() => { setIndividualSearch(filters.individual_search || ""); }, [filters.individual_search]);
  useEffect(() => { setConsolidatedSearch(filters.consolidated_search || ""); }, [filters.consolidated_search]);

  const visit = (params = {}, options = {}) => {
    router.get(route("sales-report.index"), {
      ...filters,
      ...params,
    }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      ...options,
    });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((filters.individual_search || "") !== individualSearch) {
        visit({ individual_search: individualSearch, tab: "daily" });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters.individual_search, individualSearch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((filters.consolidated_search || "") !== consolidatedSearch) {
        visit({ consolidated_search: consolidatedSearch, tab: "consolidated" });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters.consolidated_search, consolidatedSearch]);

  const loadSessionDetail = async (id) => {
    const { data } = await axios.get(route("sales-report.individual.detail", id));
    setSessionDetail(data);
  };

  const loadGroupDetail = async (row) => {
    const { data } = await axios.get(route("sales-report.consolidated.detail"), { params: { date: row.report_date, warehouse_id: row.warehouse_id } });
    setGroupDetail(data);
  };

  const closeShift = async (row) => {
    await axios.post(route("sales-report.individual.close", row.id), {});
    router.reload({ only: ["individualRows", "consolidatedRows"], preserveScroll: true, preserveState: true });
  };

  const loadCalendar = (month, year) => {
    visit({ month, year, tab: "calendar" });
  };

  const currentMonthDate = new Date(calendar.year, calendar.month - 1, 1);
  const days = (calendar.days || []).map((date) => new Date(`${date}T00:00:00`));
  const firstDayOfWeek = days.length ? days[0].getDay() : 0;

  return (
    <AppShell title="Daily Sales Reports">
      <Head title="Daily Sales Reports" />
      <div className="min-h-screen bg-slate-50 p-4 dark:bg-gray-900 md:p-8">
        <div className="space-y-4">
          <div className="flex gap-2">
            <TabButton active={activeTab === "daily"} onClick={() => { setActiveTab("daily"); visit({ tab: "daily" }); }}>Individual</TabButton>
            <TabButton active={activeTab === "consolidated"} onClick={() => { setActiveTab("consolidated"); visit({ tab: "consolidated" }); }}>Consolidated</TabButton>
            <TabButton active={activeTab === "calendar"} onClick={() => { setActiveTab("calendar"); visit({ tab: "calendar" }); }}>Daily Calendar View</TabButton>
          </div>

          {activeTab === "daily" ? (
            <Card><CardContent className="p-0">
              <div className="p-4 border-b flex flex-wrap gap-3">
                <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search sessions..." value={individualSearch} onChange={(e) => setIndividualSearch(e.target.value)} /></div>
                <div className="w-48"><Combobox value={filters.individual_branch} onValueChange={(value) => visit({ individual_branch: value || "all", tab: "daily" })} options={warehouseOptions} placeholder="All Branches" searchPlaceholder="Search branch..." className="justify-start" /></div>
                <div className="w-44"><Combobox value={filters.individual_status} onValueChange={(value) => visit({ individual_status: value || "all", tab: "daily" })} options={statusOptions} placeholder="All Statuses" searchPlaceholder="Search status..." className="justify-start" /></div>
              </div>
              <div className="max-h-[70vh] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Session #</th><th className="px-4 py-3 text-left">Cashier</th><th className="px-4 py-3 text-left">Store</th><th className="px-4 py-3 text-left">Shift</th><th className="px-4 py-3 text-right">Total Sales</th><th className="px-4 py-3 text-right">Transactions</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead><tbody>{individualRows.length ? individualRows.map((row) => <tr key={row.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 font-mono">{row.session_number}</td><td className="px-4 py-3">{row.cashier_name}</td><td className="px-4 py-3">{row.warehouse_name}</td><td className="px-4 py-3 text-xs"><div>{row.shift_start_time ? format(new Date(row.shift_start_time), "MMM dd, yyyy h:mm a") : "-"}</div><div>{row.shift_end_time ? format(new Date(row.shift_end_time), "MMM dd, yyyy h:mm a") : "Active"}</div></td><td className="px-4 py-3 text-right font-semibold">{formatPHP(row.total_sales)}</td><td className="px-4 py-3 text-right">{row.transaction_count}</td><td className="px-4 py-3 text-center">{row.status}</td><td className="px-4 py-3"><div className="flex items-center justify-center gap-2"><button onClick={() => loadSessionDetail(row.id)}><Eye className="h-4 w-4" /></button>{row.status !== "closed" ? <button onClick={() => closeShift(row)}><XCircle className="h-4 w-4 text-red-500" /></button> : null}</div></td></tr>) : <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No sessions found</td></tr>}</tbody></table></div>
            </CardContent></Card>
          ) : null}

          {activeTab === "consolidated" ? (
            <Card><CardContent className="p-0">
              <div className="p-4 border-b flex flex-wrap gap-3">
                <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search consolidated rows..." value={consolidatedSearch} onChange={(e) => setConsolidatedSearch(e.target.value)} /></div>
                <div className="w-48"><Combobox value={filters.consolidated_branch} onValueChange={(value) => visit({ consolidated_branch: value || "all", tab: "consolidated" })} options={warehouseOptions} placeholder="All Branches" searchPlaceholder="Search branch..." className="justify-start" /></div>
              </div>
              <div className="max-h-[70vh] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Branch</th><th className="px-4 py-3 text-right">Sessions</th><th className="px-4 py-3 text-right">Transactions</th><th className="px-4 py-3 text-right">Total Sales</th><th className="px-4 py-3 text-left">Shift Window</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead><tbody>{consolidatedRows.length ? consolidatedRows.map((row) => <tr key={row.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3"><div>{format(new Date(`${row.report_date}T00:00:00`), "MMM dd, yyyy")}</div><div className="text-xs text-slate-500">Week {row.week_number}</div></td><td className="px-4 py-3">{row.branch_name}</td><td className="px-4 py-3 text-right">{row.session_count}</td><td className="px-4 py-3 text-right">{row.transaction_count}</td><td className="px-4 py-3 text-right font-semibold">{formatPHP(row.total_sales)}</td><td className="px-4 py-3 text-xs"><div>{row.earliest_shift_start ? format(new Date(row.earliest_shift_start), "h:mm a") : "-"}</div><div>{row.latest_shift_end ? format(new Date(row.latest_shift_end), "h:mm a") : "Active"}</div></td><td className="px-4 py-3 text-center">{row.status}</td><td className="px-4 py-3 text-center"><button onClick={() => loadGroupDetail(row)}><Eye className="h-4 w-4" /></button></td></tr>) : <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No consolidated groups found</td></tr>}</tbody></table></div>
            </CardContent></Card>
          ) : null}

          {activeTab === "calendar" ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="pt-6"><div className="text-xs text-slate-500">Revenue</div><div className="text-2xl font-bold">{formatPHP(calendar.monthTotals.revenue)}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-xs text-slate-500">Units Sold</div><div className="text-2xl font-bold">{calendar.monthTotals.unitsSold}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-xs text-slate-500">Transactions</div><div className="text-2xl font-bold">{calendar.monthTotals.transactionCount}</div></CardContent></Card>
              </div>
              <Card><CardContent className="p-0">
                <div className="p-4 border-b flex items-center justify-between"><h3 className="text-lg font-semibold">{format(currentMonthDate, "MMMM yyyy")}</h3><div className="flex gap-1"><button onClick={() => { const d = new Date(calendar.year, calendar.month - 2, 1); loadCalendar(d.getMonth() + 1, d.getFullYear()); }} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => { const d = new Date(calendar.year, calendar.month, 1); loadCalendar(d.getMonth() + 1, d.getFullYear()); }} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="h-5 w-5" /></button></div></div>
                <div className="grid grid-cols-7 border-b">{WEEKDAY_LABELS.map((label) => <div key={label} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>)}</div>
                <div className="grid grid-cols-7">{Array.from({ length: firstDayOfWeek }).map((_, index) => <div key={`empty-${index}`} className="min-h-[120px] border-b border-r bg-gray-50/50" />)}{days.map((day) => { const key = format(day, "yyyy-MM-dd"); const metrics = calendar.dailyMap[key] || { revenue: 0, unitsSold: 0, transactionCount: 0 }; return <div key={key} className="min-h-[120px] border-b border-r p-2"><div className="text-sm font-semibold">{day.getDate()}</div><div className="mt-2 text-[11px] text-slate-500">Revenue</div><div className="text-xs font-semibold">{formatPHP(metrics.revenue)}</div><div className="mt-1 text-[11px] text-slate-500">Units</div><div className="text-xs">{metrics.unitsSold}</div><div className="mt-1 text-[11px] text-slate-500">Txns</div><div className="text-xs">{metrics.transactionCount}</div></div>; })}</div>
              </CardContent></Card>
            </div>
          ) : null}
        </div>

        <Dialog open={!!sessionDetail} onOpenChange={() => setSessionDetail(null)}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Session Details - {sessionDetail?.session?.session_number}</DialogTitle></DialogHeader>{sessionDetail ? <div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-4"><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Week #</div><div className="font-semibold">{sessionDetail.summary.weekNumber}</div></CardContent></Card><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Cashier</div><div className="font-semibold">{sessionDetail.session.cashier_name}</div></CardContent></Card><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Store</div><div className="font-semibold">{sessionDetail.session.warehouse_name}</div></CardContent></Card><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Total Sales</div><div className="font-semibold">{formatPHP(sessionDetail.summary.totalSales)}</div></CardContent></Card><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Transactions</div><div className="font-semibold">{sessionDetail.summary.transactionCount}</div></CardContent></Card></div><div className="overflow-x-auto border rounded-lg"><table className="w-full text-xs"><thead className="bg-gray-100 uppercase text-gray-500"><tr><th className="px-2 py-2 text-left">OR #</th><th className="px-2 py-2 text-left">Trans #</th><th className="px-2 py-2 text-left">Customer</th><th className="px-2 py-2 text-left">Date/Time</th><th className="px-2 py-2 text-left">Products</th><th className="px-2 py-2 text-right">Total Sales</th><th className="px-2 py-2 text-right">Actual Cash Paid</th><th className="px-2 py-2 text-left">Payment Methods</th><th className="px-2 py-2 text-left">Program</th><th className="px-2 py-2 text-right">MDR Deduction</th><th className="px-2 py-2 text-right">Net Profit</th></tr></thead><tbody>{sessionDetail.transactions.map((tx) => <tr key={tx.id} className="border-t"><td className="px-2 py-2"><button onClick={() => setTransactionDialogId(tx.id)} className="text-indigo-600 hover:underline">{tx.or_number}</button></td><td className="px-2 py-2">{tx.transaction_number}</td><td className="px-2 py-2">{tx.customer_name}</td><td className="px-2 py-2">{tx.transaction_date ? format(new Date(tx.transaction_date), "MMM dd, yyyy h:mm a") : "-"}</td><td className="px-2 py-2">{tx.products.map((product) => <div key={product.name}>{product.name}</div>)}</td><td className="px-2 py-2 text-right">{formatPHP(tx.total_sales)}</td><td className="px-2 py-2 text-right">{formatPHP(tx.actual_cash_paid)}</td><td className="px-2 py-2">{tx.payment_methods.map((payment) => <div key={`${tx.id}-${payment.payment_method}`}>{payment.payment_method} ({formatPHP(payment.amount)})</div>)}</td><td className="px-2 py-2">{tx.program_names.length ? tx.program_names.join(", ") : "-"}</td><td className="px-2 py-2 text-right">{tx.mdr_deduction ? `-${formatPHP(tx.mdr_deduction)}` : "-"}</td><td className="px-2 py-2 text-right">{formatPHP(tx.net_profit)}</td></tr>)}</tbody></table></div></div> : null}</DialogContent>
        </Dialog>

        <Dialog open={!!groupDetail} onOpenChange={() => setGroupDetail(null)}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Consolidated Sales Report</DialogTitle></DialogHeader>{groupDetail ? <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Gross Sales</div><div className="text-xl font-bold">{formatPHP(groupDetail.summary.grossSales)}</div></CardContent></Card><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Net Sales</div><div className="text-xl font-bold">{formatPHP(groupDetail.summary.netSales)}</div></CardContent></Card><Card><CardContent className="pt-4"><div className="text-xs text-slate-500">Transaction Count</div><div className="text-xl font-bold">{groupDetail.summary.transactionCount}</div></CardContent></Card></div><div className="flex justify-end"><Button variant="outline" onClick={() => { window.location.href = route("sales-report.consolidated.export.xlsx", { date: groupDetail.group.report_date, warehouse_id: groupDetail.group.warehouse_id }); }}><Download className="mr-2 h-4 w-4" />Export XLSX</Button></div><div className="overflow-auto border rounded-lg max-h-[55vh]"><table className="min-w-max text-xs"><thead className="sticky top-0 bg-gray-100 uppercase text-gray-500"><tr><th className="px-3 py-2 text-left">Customer Name</th><th className="px-3 py-2 text-left">Contact Number</th><th className="px-3 py-2 text-left">DR#</th><th className="px-3 py-2 text-left">OR#</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Condition</th><th className="px-3 py-2 text-left">Warranty</th><th className="px-3 py-2 text-left">Qty</th><th className="px-3 py-2 text-left">Barcode</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-left">Sale Person</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Actual Cash Paid</th><th className="px-3 py-2 text-right">Discount</th><th className="px-3 py-2 text-right">NON CASH PAYMENT</th><th className="px-3 py-2 text-left">Reference Number</th><th className="px-3 py-2 text-left">Loan Term</th>{groupDetail.dynamicPaymentColumns.map((column) => <th key={column} className="px-3 py-2 text-right">{column}</th>)}</tr></thead><tbody>{groupDetail.ledgerRows.map((row, index) => <tr key={index} className="border-t"><td className="px-3 py-2">{row.customerName}</td><td className="px-3 py-2">{row.contactNumber}</td><td className="px-3 py-2">{row.drNumber}</td><td className="px-3 py-2">{row.orNumber}</td><td className="px-3 py-2">{row.productName}</td><td className="px-3 py-2">{row.condition}</td><td className="px-3 py-2">{row.warranty}</td><td className="px-3 py-2">{row.quantity}</td><td className="px-3 py-2">{row.barcode}</td><td className="px-3 py-2 text-right">{formatPHP(row.value)}</td><td className="px-3 py-2">{row.salesPersonName}</td><td className="px-3 py-2">{row.date ? format(new Date(row.date), "MM-dd-yy") : "-"}</td><td className="px-3 py-2 text-right">{row.actualCashPaid === null ? "-" : formatPHP(row.actualCashPaid)}</td><td className="px-3 py-2 text-right">{row.discountAmount ? formatPHP(row.discountAmount) : "-"}</td><td className="px-3 py-2 text-right">{row.nonCashPaymentAmount === null ? "-" : formatPHP(row.nonCashPaymentAmount)}</td><td className="px-3 py-2">{row.nonCashReferenceNumber}</td><td className="px-3 py-2">{row.loanTermLabel}</td>{groupDetail.dynamicPaymentColumns.map((column) => <td key={`${index}-${column}`} className="px-3 py-2 text-right">{row.dynamicPaymentAmounts[column] ? formatPHP(row.dynamicPaymentAmounts[column]) : "-"}</td>)}</tr>)}</tbody></table></div></div> : null}</DialogContent>
        </Dialog>

        <TransactionDetailsDialog open={!!transactionDialogId} onOpenChange={() => setTransactionDialogId(null)} transactionId={transactionDialogId} endpoint={transactionDialogId ? route("sales-report.transaction", transactionDialogId) : null} />
      </div>
    </AppShell>
  );
}
