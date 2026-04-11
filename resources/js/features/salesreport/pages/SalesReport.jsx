import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Combobox } from "@/shared/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import TransactionDetailsDialog from "@/features/salesreport/TransactionDetailsDialog";
import { Search, Eye, ChevronLeft, ChevronRight, Download, XCircle, CalendarRange, UserRound, Receipt, Landmark } from "lucide-react";
import { format } from "date-fns";

const formatPHP = (amount) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount || 0);
const formatNumber = (value) => new Intl.NumberFormat("en-PH").format(value || 0);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/60">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function getStatusBadge(status) {
  const isClosed = status === "closed";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${isClosed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
      {isClosed ? "Closed" : "Active"}
    </span>
  );
}

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

  const selectedGroupMetrics = useMemo(() => {
    if (!groupDetail) {
      return null;
    }

    const sessions = groupDetail.group?.sessions || [];

    return {
      netSales: groupDetail.summary?.netSales || 0,
      primaryCashiers: [...new Set(sessions.map((session) => session.cashier_name).filter(Boolean))],
      paymentMethodTotals: Object.entries(groupDetail.paymentMethodSummary || {}),
      nonCashMethodTotals: Object.entries(groupDetail.nonCashBreakdown || {}),
      totalCardTerminalFees: groupDetail.terminalFeeSummary?.total || 0,
    };
  }, [groupDetail]);

  const ledgerRows = groupDetail?.ledgerRows || [];
  const dynamicPaymentColumns = groupDetail?.dynamicPaymentColumns || [];

  const handleExportTransactions = () => {
    if (!groupDetail?.group) {
      return;
    }

    window.location.href = route("sales-report.consolidated.export.xlsx", {
      date: groupDetail.group.report_date,
      warehouse_id: groupDetail.group.warehouse_id,
    });
  };

  const currentMonthDate = new Date(calendar.year, calendar.month - 1, 1);
  const days = (calendar.days || []).map((date) => new Date(`${date}T00:00:00`));
  const firstDayOfWeek = days.length ? days[0].getDay() : 0;

  return (
    <AppShell title="Daily Sales Reports">
      <Head title="Daily Sales Reports" />
      <div className="min-h-screen bg-background p-2">
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
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-x-hidden overflow-y-auto border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_35%),linear-gradient(to_bottom,_#ffffff,_#f8fafc)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(to_bottom,_#020617,_#020617)]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Consolidated Details</DialogTitle>
            </DialogHeader>

            {groupDetail && selectedGroupMetrics ? (
              <div className="min-w-0 space-y-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(30,41,59,0.98),_rgba(15,23,42,0.94))] p-6 text-white shadow-xl dark:border-slate-700">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">Branch Consolidated Turnover</div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight">{groupDetail.group.branch_name}</h3>
                        <p className="mt-1 text-sm text-slate-300">{groupDetail.group.report_date ? format(new Date(`${groupDetail.group.report_date}T00:00:00`), "MMMM dd, yyyy") : "-"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300"><CalendarRange className="h-3.5 w-3.5" />Coverage</div>
                        <div className="text-sm font-semibold">{groupDetail.group.earliest_shift_start ? format(new Date(groupDetail.group.earliest_shift_start), "h:mm a") : "-"} to {groupDetail.group.latest_shift_end ? format(new Date(groupDetail.group.latest_shift_end), "h:mm a") : "Active"}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300"><UserRound className="h-3.5 w-3.5" />Cashiers</div>
                        <div className="text-sm font-semibold">{selectedGroupMetrics.primaryCashiers.join(", ") || "Unknown"}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300"><Receipt className="h-3.5 w-3.5" />Sessions</div>
                        <div className="text-sm font-semibold">{formatNumber(groupDetail.group.session_count)} sessions / {formatNumber(groupDetail.group.transaction_count)} txns</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"><CardContent className="p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">POS Sales System</p><p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPHP(selectedGroupMetrics.netSales)}</p></CardContent></Card>
                  <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"><CardContent className="p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Transaction Count</p><p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(groupDetail.group.transaction_count)}</p></CardContent></Card>
                </div>

                <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100"><Landmark className="h-4 w-4 text-blue-500" />Non-Cash Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedGroupMetrics.nonCashMethodTotals.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No non-cash payments recorded.</p> : selectedGroupMetrics.nonCashMethodTotals.map(([method, amount]) => <MetricRow key={method} label={method} value={formatPHP(amount)} />)}
                    {selectedGroupMetrics.totalCardTerminalFees > 0 ? <><Separator className="my-2 bg-slate-200 dark:bg-slate-800" /><MetricRow label="Total Terminal Fee" value={formatPHP(selectedGroupMetrics.totalCardTerminalFees)} /></> : null}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardHeader className="pb-3"><CardTitle className="text-base text-slate-900 dark:text-slate-100">Payment Method Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {selectedGroupMetrics.paymentMethodTotals.map(([method, amount]) => <div key={method} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{method}</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{formatPHP(amount)}</p></div>)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardHeader className="pb-3"><CardTitle className="text-base text-slate-900 dark:text-slate-100">Source Sessions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100/90 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr><th className="px-3 py-2 text-left whitespace-nowrap">Session #</th><th className="px-3 py-2 text-left whitespace-nowrap">Cashier</th><th className="px-3 py-2 text-left whitespace-nowrap">Shift Start</th><th className="px-3 py-2 text-left whitespace-nowrap">Shift End</th><th className="px-3 py-2 text-right whitespace-nowrap">Transactions</th><th className="px-3 py-2 text-right whitespace-nowrap">Total Sales</th><th className="px-3 py-2 text-center whitespace-nowrap">Status</th></tr></thead>
                        <tbody className="bg-white dark:bg-slate-950/40">
                          {(groupDetail.group.sessions || []).map((session) => <tr key={session.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{session.session_number || "-"}</td><td className="px-3 py-2 text-slate-700 dark:text-slate-300">{session.cashier_name}</td><td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{session.shift_start_time ? format(new Date(session.shift_start_time), "MMM dd, yyyy h:mm a") : "-"}</td><td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{session.shift_end_time ? format(new Date(session.shift_end_time), "MMM dd, yyyy h:mm a") : "Active"}</td><td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{session.transaction_count}</td><td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">{formatPHP(session.total_sales)}</td><td className="px-3 py-2 text-center">{getStatusBadge(session.status === "closed" ? "closed" : "active")}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 w-full max-w-full border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                  <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base text-slate-900 dark:text-slate-100">Transactions</CardTitle><Button type="button" variant="outline" size="sm" onClick={handleExportTransactions} disabled={ledgerRows.length === 0}><Download className="mr-2 h-4 w-4" />Export XLSX</Button></div></CardHeader>
                  <CardContent className="min-w-0 max-w-full overflow-x-hidden">
                    <div className="max-h-[58vh] w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="min-w-max text-xs">
                        <thead className="sticky top-0 z-20 bg-slate-100/95 text-[10px] uppercase tracking-[0.14em] text-slate-500 backdrop-blur dark:bg-slate-900/95 dark:text-slate-400">
                          <tr><th className="w-[180px] min-w-[180px] bg-slate-100 px-3 py-2 text-left whitespace-nowrap dark:bg-slate-900">Customer Name</th><th className="w-[140px] min-w-[140px] bg-slate-100 px-3 py-2 text-left whitespace-nowrap dark:bg-slate-900">Contact Number</th><th className="w-[140px] min-w-[140px] bg-slate-100 px-3 py-2 text-left whitespace-nowrap dark:bg-slate-900" title="Using transaction number as closest available DR reference">DR#</th><th className="px-3 py-2 text-left whitespace-nowrap">OR#</th><th className="px-3 py-2 text-left whitespace-nowrap">Product</th><th className="px-3 py-2 text-left whitespace-nowrap">Condition</th><th className="px-3 py-2 text-left whitespace-nowrap">Warranty</th><th className="px-3 py-2 text-left whitespace-nowrap">Category</th><th className="px-3 py-2 text-left whitespace-nowrap">Subcategory</th><th className="px-3 py-2 text-center whitespace-nowrap">Qty</th><th className="px-3 py-2 text-left whitespace-nowrap">Barcode</th><th className="px-3 py-2 text-right whitespace-nowrap">Value</th><th className="px-3 py-2 text-left whitespace-nowrap">Sale Person</th><th className="px-3 py-2 text-left whitespace-nowrap">Date</th><th className="px-3 py-2 text-right whitespace-nowrap">Actual Cash Paid</th><th className="px-3 py-2 text-right whitespace-nowrap">Discount</th><th className="px-3 py-2 text-right whitespace-nowrap">TF Paid in Cash</th><th className="px-3 py-2 text-right whitespace-nowrap">NON CASH PAYMENT</th><th className="px-3 py-2 text-left whitespace-nowrap">Reference Number</th><th className="px-3 py-2 text-left whitespace-nowrap">Loan Term</th><th className="px-3 py-2 text-right whitespace-nowrap">MDR</th><th className="px-3 py-2 text-right whitespace-nowrap">Receivable</th>{dynamicPaymentColumns.map((columnLabel) => <th key={columnLabel} className="px-3 py-2 text-right whitespace-nowrap">{columnLabel}</th>)}</tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-950/40">
                          {ledgerRows.length === 0 ? <tr><td colSpan={22 + dynamicPaymentColumns.length} className="px-4 py-8 text-center text-slate-500">No transactions found</td></tr> : ledgerRows.map((row) => <tr key={row.id} className={`border-t border-slate-200 dark:border-slate-800 ${row.rowTone || ""}`}>
                            <td className="w-[180px] min-w-[180px] overflow-hidden px-3 py-2 font-semibold text-slate-900 whitespace-nowrap dark:text-slate-100">{row.hideFirstFourColumns ? "" : row.customerName}</td>
                            <td className="w-[140px] min-w-[140px] overflow-hidden px-3 py-2 text-slate-700 whitespace-nowrap dark:text-slate-300">{row.hideFirstFourColumns ? "" : row.contactNumber}</td>
                            <td className="w-[140px] min-w-[140px] overflow-hidden px-3 py-2 font-mono text-slate-700 whitespace-nowrap dark:text-slate-300">{row.hideFirstFourColumns ? "" : row.drNumber}</td>
                            <td className="px-3 py-2">{row.hideFirstFourColumns ? "" : <button type="button" onClick={() => setTransactionDialogId(row.transactionId)} className="font-mono text-indigo-600 hover:underline dark:text-indigo-400">{row.orNumber}</button>}</td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100 min-w-[280px]">{row.isRepeatedPaymentRow ? "" : <div className="font-semibold leading-tight">{row.productName}</div>}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.condition}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 min-w-[180px]">{row.isRepeatedPaymentRow ? "" : row.warranty}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.categoryName}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.subcategoryName}</td>
                            <td className="px-3 py-2 text-center font-semibold text-slate-900 dark:text-slate-100">{row.isRepeatedPaymentRow ? "" : row.quantity}</td>
                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.barcode}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.isRepeatedPaymentRow || row.value === null ? "" : formatPHP(row.value)}</td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.salesPersonName}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.date ? format(new Date(row.date), "MM-dd-yy") : "-"}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.actualCashPaid === null ? "-" : row.isSplitActualCashPaid ? <>{formatPHP(row.actualCashPaid)} <span className="text-emerald-600 dark:text-emerald-400">(split from {formatPHP(row.actualCashPaidSourceAmount)})</span></> : formatPHP(row.actualCashPaid)}</td>
                            <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{row.discountAmount > 0 ? <span className="text-rose-600 dark:text-rose-400">{formatPHP(row.discountAmount)}</span> : <span className="text-slate-900 dark:text-slate-100">-</span>}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.terminalFeePaidInCash === null ? "-" : formatPHP(row.terminalFeePaidInCash)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.nonCashPaymentAmount === null ? "-" : formatPHP(row.nonCashPaymentAmount)}</td>
                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.nonCashReferenceNumber}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.loanTermLabel}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.mdrAmount === null ? "-" : formatPHP(row.mdrAmount)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.receivableAmount === null ? "-" : <>{formatPHP(row.receivableAmount)} <span className="text-emerald-600 dark:text-emerald-400">({row.mdrPercentLabel})</span></>}</td>
                            {dynamicPaymentColumns.map((columnLabel) => <td key={`${row.id}-${columnLabel}`} className={`px-3 py-2 text-right whitespace-nowrap ${row.dynamicPaymentAmounts[columnLabel] === 0 ? "text-slate-400 dark:text-slate-500" : "font-semibold text-slate-900 dark:text-slate-100"}`}>{row.dynamicPaymentAmounts[columnLabel] === null ? "-" : formatPHP(row.dynamicPaymentAmounts[columnLabel])}</td>)}
                          </tr>)}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <TransactionDetailsDialog open={!!transactionDialogId} onOpenChange={() => setTransactionDialogId(null)} transactionId={transactionDialogId} endpoint={transactionDialogId ? route("sales-report.transaction", transactionDialogId) : null} />
      </div>
    </AppShell>
  );
}
