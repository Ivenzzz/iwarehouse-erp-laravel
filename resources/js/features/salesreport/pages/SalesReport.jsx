import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Combobox } from "@/shared/components/ui/combobox";
import { Separator } from "@/shared/components/ui/separator";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import TransactionDetailsDialog from "@/features/salesreport/TransactionDetailsDialog";
import {
  Search, Eye, ChevronLeft, ChevronRight, Download,
  XCircle, CalendarRange, UserRound, Landmark,
} from "lucide-react";
import { format } from "date-fns";

// ─── Formatters ──────────────────────────────────────────────────────────────
const formatPHP    = (v) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(v || 0);
const formatNumber = (v) => new Intl.NumberFormat("en-PH").format(v || 0);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Compact table header cell */
function Th({ children, className = "" }) {
  return (
    <th className={`sticky top-0 z-10 bg-slate-100/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur whitespace-nowrap dark:bg-slate-900/95 dark:text-slate-400 ${className}`}>
      {children}
    </th>
  );
}

/** Compact table body cell */
function Td({ children, className = "" }) {
  return (
    <td className={`px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 ${className}`}>
      {children}
    </td>
  );
}

/** Small key–value row used in the summary sidebar */
function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-slate-100/70 px-2.5 py-1.5 text-xs dark:bg-slate-800/60">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

/** Metric card used in session summary header and calendar totals */
function StatCard({ label, value, accent = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${accent
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums leading-tight ${accent
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-slate-900 dark:text-slate-100"
      }`}>{value}</p>
    </div>
  );
}

/** Status badge */
function StatusBadge({ status }) {
  const closed = status === "closed";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
      closed
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
    }`}>
      {closed ? "Closed" : "Active"}
    </span>
  );
}

/** Underline-style tab navigation */
const TABS = [
  { id: "daily",        label: "Individual"          },
  { id: "consolidated", label: "Consolidated"         },
  { id: "calendar",     label: "Daily Calendar View"  },
];

function TabNav({ active, onChange }) {
  return (
    <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <nav className="flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Filter toolbar strip */
function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SalesReport({ filters, warehouses, individualRows, consolidatedRows, calendar }) {
  const [activeTab,          setActiveTab]          = useState(filters.tab || "consolidated");
  const [sessionDetail,      setSessionDetail]      = useState(null);
  const [groupDetail,        setGroupDetail]        = useState(null);
  const [transactionDialogId,setTransactionDialogId]= useState(null);
  const [individualSearch,   setIndividualSearch]   = useState(filters.individual_search || "");
  const [consolidatedSearch, setConsolidatedSearch] = useState(filters.consolidated_search || "");

  const warehouseOptions = useMemo(
    () => [{ value: "all", label: "All Branches" }, ...warehouses.map((w) => ({ value: String(w.id), label: w.name }))],
    [warehouses],
  );
  const statusOptions = [
    { value: "all",    label: "All Statuses" },
    { value: "opened", label: "Opened"       },
    { value: "closed", label: "Closed"       },
  ];

  // Sync state when filters change server-side
  useEffect(() => { setActiveTab(filters.tab || "consolidated"); },          [filters.tab]);
  useEffect(() => { setIndividualSearch(filters.individual_search || ""); }, [filters.individual_search]);
  useEffect(() => { setConsolidatedSearch(filters.consolidated_search || ""); }, [filters.consolidated_search]);

  const visit = (params = {}, options = {}) =>
    router.get(route("sales-report.index"), { ...filters, ...params }, {
      preserveState: true, preserveScroll: true, replace: true, ...options,
    });

  const handleTabChange = (tab) => { setActiveTab(tab); visit({ tab }); };

  // Debounced individual search
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((filters.individual_search || "") !== individualSearch)
        visit({ individual_search: individualSearch, tab: "daily" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [filters.individual_search, individualSearch]);

  // Debounced consolidated search
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((filters.consolidated_search || "") !== consolidatedSearch)
        visit({ consolidated_search: consolidatedSearch, tab: "consolidated" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [filters.consolidated_search, consolidatedSearch]);

  const loadSessionDetail = async (id) => {
    const { data } = await axios.get(route("sales-report.individual.detail", id));
    setSessionDetail(data);
  };

  const loadGroupDetail = async (row) => {
    const { data } = await axios.get(route("sales-report.consolidated.detail"), {
      params: { date: row.report_date, warehouse_id: row.warehouse_id },
    });
    setGroupDetail(data);
  };

  const closeShift = async (row) => {
    await axios.post(route("sales-report.individual.close", row.id), {});
    router.reload({ only: ["individualRows", "consolidatedRows"], preserveScroll: true, preserveState: true });
  };

  const loadCalendar = (month, year) => visit({ month, year, tab: "calendar" });

  // Derived metrics for group detail
  const selectedGroupMetrics = useMemo(() => {
    if (!groupDetail) return null;
    const sessions = groupDetail.group?.sessions || [];
    return {
      netSales:              groupDetail.summary?.netSales || 0,
      primaryCashiers:       [...new Set(sessions.map((s) => s.cashier_name).filter(Boolean))],
      paymentMethodTotals:   Object.entries(groupDetail.paymentMethodSummary || {}),
      nonCashMethodTotals:   Object.entries(groupDetail.nonCashBreakdown || {}),
      totalCardTerminalFees: groupDetail.terminalFeeSummary?.total || 0,
    };
  }, [groupDetail]);

  const ledgerRows              = groupDetail?.ledgerRows              || [];
  const dynamicPaymentColumns   = groupDetail?.dynamicPaymentColumns   || [];

  const handleExportTransactions = () => {
    if (!groupDetail?.group) return;
    window.location.href = route("sales-report.consolidated.export.xlsx", {
      date:         groupDetail.group.report_date,
      warehouse_id: groupDetail.group.warehouse_id,
    });
  };

  // Calendar helpers
  const currentMonthDate = new Date(calendar.year, calendar.month - 1, 1);
  const days             = (calendar.days || []).map((d) => new Date(`${d}T00:00:00`));
  const firstDayOfWeek   = days.length ? days[0].getDay() : 0;

  return (
    <AppShell title="Daily Sales Reports">
      <Head title="Daily Sales Reports" />

      <div className="min-h-screen bg-background">

        {/* ── Underline Tab Nav ─────────────────────────────────────────────── */}
        <TabNav active={activeTab} onChange={handleTabChange} />

        {/* ════════════════════════════════════════════════════════════════════
            INDIVIDUAL TAB
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "daily" && (
          <div className="border-x border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <FilterBar>
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-8 pl-8 text-xs"
                  placeholder="Search sessions…"
                  value={individualSearch}
                  onChange={(e) => setIndividualSearch(e.target.value)}
                />
              </div>
              <div className="w-44">
                <Combobox
                  value={filters.individual_branch}
                  onValueChange={(v) => visit({ individual_branch: v || "all", tab: "daily" })}
                  options={warehouseOptions}
                  placeholder="All Branches"
                  searchPlaceholder="Search branch…"
                  className="h-8 justify-start text-xs"
                />
              </div>
              <div className="w-36">
                <Combobox
                  value={filters.individual_status}
                  onValueChange={(v) => visit({ individual_status: v || "all", tab: "daily" })}
                  options={statusOptions}
                  placeholder="All Statuses"
                  searchPlaceholder="Search status…"
                  className="h-8 justify-start text-xs"
                />
              </div>
            </FilterBar>

            <div className="max-h-[74vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th className="text-left">Session #</Th>
                    <Th className="text-left">Cashier</Th>
                    <Th className="text-left">Store</Th>
                    <Th className="text-left">Shift Start</Th>
                    <Th className="text-left">Shift End</Th>
                    <Th className="text-right">Total Sales</Th>
                    <Th className="text-right">Txns</Th>
                    <Th className="text-center">Status</Th>
                    <Th className="text-right"></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {individualRows.length ? individualRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <Td><span className="font-mono text-indigo-600 dark:text-indigo-400">{row.session_number}</span></Td>
                      <Td>{row.cashier_name}</Td>
                      <Td>{row.warehouse_name}</Td>
                      <Td className="whitespace-nowrap text-slate-500">
                        {row.shift_start_time ? format(new Date(row.shift_start_time), "MMM dd, yy h:mm a") : "—"}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {row.shift_end_time
                          ? <span className="text-slate-500">{format(new Date(row.shift_end_time), "MMM dd, yy h:mm a")}</span>
                          : <span className="font-medium text-amber-500">Active</span>}
                      </Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatPHP(row.total_sales)}</Td>
                      <Td className="text-right tabular-nums">{row.transaction_count}</Td>
                      <Td className="text-center"><StatusBadge status={row.status} /></Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => loadSessionDetail(row.id)}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          ><Eye className="h-3.5 w-3.5" /></button>
                          {row.status !== "closed" && (
                            <button
                              onClick={() => closeShift(row)}
                              className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                            ><XCircle className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-400">No sessions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            CONSOLIDATED TAB
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "consolidated" && (
          <div className="border-x border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <FilterBar>
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-8 pl-8 text-xs"
                  placeholder="Search consolidated rows…"
                  value={consolidatedSearch}
                  onChange={(e) => setConsolidatedSearch(e.target.value)}
                />
              </div>
              <div className="w-44">
                <Combobox
                  value={filters.consolidated_branch}
                  onValueChange={(v) => visit({ consolidated_branch: v || "all", tab: "consolidated" })}
                  options={warehouseOptions}
                  placeholder="All Branches"
                  searchPlaceholder="Search branch…"
                  className="h-8 justify-start text-xs"
                />
              </div>
            </FilterBar>

            <div className="max-h-[74vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th className="text-left">Date</Th>
                    <Th className="text-left">Branch</Th>
                    <Th className="text-right">Sessions</Th>
                    <Th className="text-right">Transactions</Th>
                    <Th className="text-right">Total Sales</Th>
                    <Th className="text-left">Shift Window</Th>
                    <Th className="text-center">Status</Th>
                    <Th className="text-right"></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {consolidatedRows.length ? consolidatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <Td>
                        <div className="whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                          {format(new Date(`${row.report_date}T00:00:00`), "MMM dd, yyyy")}
                        </div>
                        <div className="text-[10px] text-slate-400">Wk {row.week_number}</div>
                      </Td>
                      <Td>{row.branch_name}</Td>
                      <Td className="text-right tabular-nums">{row.session_count}</Td>
                      <Td className="text-right tabular-nums">{row.transaction_count}</Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatPHP(row.total_sales)}</Td>
                      <Td className="whitespace-nowrap text-slate-500">
                        {row.earliest_shift_start ? format(new Date(row.earliest_shift_start), "h:mm a") : "—"}
                        {" – "}
                        {row.latest_shift_end
                          ? format(new Date(row.latest_shift_end), "h:mm a")
                          : <span className="font-medium text-amber-500">Active</span>}
                      </Td>
                      <Td className="text-center"><StatusBadge status={row.status} /></Td>
                      <Td className="text-right">
                        <button
                          onClick={() => loadGroupDetail(row)}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        ><Eye className="h-3.5 w-3.5" /></button>
                      </Td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">No consolidated groups found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            CALENDAR TAB
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "calendar" && (
          <div className="space-y-3 p-3">
            {/* Month totals */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Revenue"      value={formatPHP(calendar.monthTotals.revenue)}                  accent />
              <StatCard label="Units Sold"   value={formatNumber(calendar.monthTotals.unitsSold)}             />
              <StatCard label="Transactions" value={formatNumber(calendar.monthTotals.transactionCount)}      />
            </div>

            {/* Calendar */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              {/* Month nav */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {format(currentMonthDate, "MMMM yyyy")}
                </h3>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => { const d = new Date(calendar.year, calendar.month - 2, 1); loadCalendar(d.getMonth() + 1, d.getFullYear()); }}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  ><ChevronLeft className="h-4 w-4" /></button>
                  <button
                    onClick={() => { const d = new Date(calendar.year, calendar.month, 1); loadCalendar(d.getMonth() + 1, d.getFullYear()); }}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  ><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {label}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[88px] border-b border-r border-slate-100 bg-slate-50/60 dark:border-slate-800/50 dark:bg-slate-900/20" />
                ))}
                {days.map((day) => {
                  const key     = format(day, "yyyy-MM-dd");
                  const metrics = calendar.dailyMap[key] || { revenue: 0, unitsSold: 0, transactionCount: 0 };
                  const hasData = metrics.revenue > 0;
                  return (
                    <div
                      key={key}
                      className={`min-h-[88px] border-b border-r border-slate-100 p-2 dark:border-slate-800/50 ${
                        hasData ? "bg-white dark:bg-slate-950" : "bg-slate-50/40 dark:bg-slate-900/20"
                      }`}
                    >
                      <div className={`mb-1 text-xs font-bold ${hasData ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}>
                        {day.getDate()}
                      </div>
                      {hasData ? (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatPHP(metrics.revenue)}
                          </div>
                          <div className="flex gap-2 text-[10px] text-slate-500">
                            <span>{formatNumber(metrics.unitsSold)} units</span>
                            <span>{formatNumber(metrics.transactionCount)} txns</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-300 dark:text-slate-700">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SESSION DETAIL DIALOG
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!sessionDetail} onOpenChange={() => setSessionDetail(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <div className="mb-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Session Details</p>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {sessionDetail?.session?.session_number}
            </h2>
          </div>

          {sessionDetail && (
            <div className="space-y-3">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <StatCard label="Week #"       value={sessionDetail.summary.weekNumber}                   />
                <StatCard label="Cashier"      value={sessionDetail.session.cashier_name}                 />
                <StatCard label="Store"        value={sessionDetail.session.warehouse_name}               />
                <StatCard label="Total Sales"  value={formatPHP(sessionDetail.summary.totalSales)} accent />
                <StatCard label="Transactions" value={sessionDetail.summary.transactionCount}             />
              </div>

              {/* Transactions table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th className="text-left">OR #</Th>
                      <Th className="text-left">Trans #</Th>
                      <Th className="text-left">Customer</Th>
                      <Th className="text-left">Date/Time</Th>
                      <Th className="text-left">Products</Th>
                      <Th className="text-right">Total Sales</Th>
                      <Th className="text-right">Cash Paid</Th>
                      <Th className="text-left">Payment Methods</Th>
                      <Th className="text-left">Program</Th>
                      <Th className="text-right">MDR</Th>
                      <Th className="text-right">Net Profit</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                    {sessionDetail.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <Td>
                          <button
                            onClick={() => setTransactionDialogId(tx.id)}
                            className="font-mono text-indigo-600 hover:underline dark:text-indigo-400"
                          >{tx.or_number}</button>
                        </Td>
                        <Td className="font-mono">{tx.transaction_number}</Td>
                        <Td className="whitespace-nowrap">{tx.customer_name}</Td>
                        <Td className="whitespace-nowrap text-slate-500">
                          {tx.transaction_date ? format(new Date(tx.transaction_date), "MMM dd, yy h:mm a") : "—"}
                        </Td>
                        <Td>{tx.products.map((p) => <div key={p.name}>{p.name}</div>)}</Td>
                        <Td className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatPHP(tx.total_sales)}</Td>
                        <Td className="text-right tabular-nums">{formatPHP(tx.actual_cash_paid)}</Td>
                        <Td>
                          {tx.payment_methods.map((pm) => (
                            <div key={`${tx.id}-${pm.payment_method}`}>
                              {pm.payment_method} <span className="text-slate-400">({formatPHP(pm.amount)})</span>
                            </div>
                          ))}
                        </Td>
                        <Td>{tx.program_names.length ? tx.program_names.join(", ") : "—"}</Td>
                        <Td className="text-right tabular-nums text-rose-500">
                          {tx.mdr_deduction ? `-${formatPHP(tx.mdr_deduction)}` : "—"}
                        </Td>
                        <Td className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatPHP(tx.net_profit)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          GROUP DETAIL DIALOG — two-column layout
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!groupDetail} onOpenChange={() => setGroupDetail(null)}>
        <DialogContent className="flex h-[88vh] max-w-[92vw] flex-col gap-0 overflow-hidden border border-slate-200 p-0 dark:border-slate-800">

          {/* ── Header bar ── */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consolidated Details</p>
              {groupDetail && (
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {groupDetail.group.branch_name}
                  {groupDetail.group.report_date && (
                    <span className="ml-2 font-normal text-slate-500">
                      {format(new Date(`${groupDetail.group.report_date}T00:00:00`), "MMMM dd, yyyy")}
                    </span>
                  )}
                </h2>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportTransactions}
              disabled={ledgerRows.length === 0}
              className="h-7 text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />Export XLSX
            </Button>
          </div>

          {/* ── Body: left summary + right tables ── */}
          {groupDetail && selectedGroupMetrics && (
            <div className="flex min-h-0 flex-1">

              {/* LEFT — Summary sidebar */}
              <div className="w-60 shrink-0 space-y-3 overflow-y-auto border-r border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/30">

                {/* Key numbers */}
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</p>
                  <div className="space-y-1.5">
                    <StatCard label="POS Net Sales"  value={formatPHP(selectedGroupMetrics.netSales)}                    accent />
                    <StatCard label="Transactions"   value={formatNumber(groupDetail.group.transaction_count)}           />
                    <StatCard label="Sessions"       value={formatNumber(groupDetail.group.session_count)}               />
                  </div>
                </section>

                {/* Coverage */}
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Coverage</p>
                  <div className="space-y-1.5">
                    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <CalendarRange className="h-3 w-3" />Shift Window
                      </div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {groupDetail.group.earliest_shift_start
                          ? format(new Date(groupDetail.group.earliest_shift_start), "h:mm a")
                          : "—"}
                        {" – "}
                        {groupDetail.group.latest_shift_end
                          ? format(new Date(groupDetail.group.latest_shift_end), "h:mm a")
                          : <span className="text-amber-500">Active</span>}
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <UserRound className="h-3 w-3" />Cashiers
                      </div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {selectedGroupMetrics.primaryCashiers.join(", ") || "Unknown"}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Non-cash */}
                <section>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Landmark className="h-3 w-3" />Non-Cash
                  </p>
                  {selectedGroupMetrics.nonCashMethodTotals.length === 0 ? (
                    <p className="text-[11px] text-slate-400">None recorded</p>
                  ) : (
                    <div className="space-y-0.5">
                      {selectedGroupMetrics.nonCashMethodTotals.map(([method, amount]) => (
                        <MetricRow key={method} label={method} value={formatPHP(amount)} />
                      ))}
                      {selectedGroupMetrics.totalCardTerminalFees > 0 && (
                        <>
                          <Separator className="my-1 bg-slate-200 dark:bg-slate-700" />
                          <MetricRow label="Terminal Fee" value={formatPHP(selectedGroupMetrics.totalCardTerminalFees)} />
                        </>
                      )}
                    </div>
                  )}
                </section>

                {/* Payment methods */}
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Methods</p>
                  <div className="space-y-0.5">
                    {selectedGroupMetrics.paymentMethodTotals.map(([method, amount]) => (
                      <MetricRow key={method} label={method} value={formatPHP(amount)} />
                    ))}
                  </div>
                </section>
              </div>

              {/* RIGHT — Tables */}
              <div className="flex-1 space-y-4 overflow-y-auto p-3">

                {/* Source sessions */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source Sessions</p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <Th className="text-left">Session #</Th>
                          <Th className="text-left">Cashier</Th>
                          <Th className="text-left">Shift Start</Th>
                          <Th className="text-left">Shift End</Th>
                          <Th className="text-right">Txns</Th>
                          <Th className="text-right">Total Sales</Th>
                          <Th className="text-center">Status</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                        {(groupDetail.group.sessions || []).map((session) => (
                          <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                            <Td><span className="font-mono text-indigo-600 dark:text-indigo-400">{session.session_number || "—"}</span></Td>
                            <Td>{session.cashier_name}</Td>
                            <Td className="whitespace-nowrap text-slate-500">
                              {session.shift_start_time ? format(new Date(session.shift_start_time), "MMM dd, yy h:mm a") : "—"}
                            </Td>
                            <Td className="whitespace-nowrap">
                              {session.shift_end_time
                                ? <span className="text-slate-500">{format(new Date(session.shift_end_time), "MMM dd, yy h:mm a")}</span>
                                : <span className="font-medium text-amber-500">Active</span>}
                            </Td>
                            <Td className="text-right tabular-nums">{session.transaction_count}</Td>
                            <Td className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatPHP(session.total_sales)}</Td>
                            <Td className="text-center"><StatusBadge status={session.status === "closed" ? "closed" : "active"} /></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ledger / Transactions */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Transactions</p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="min-w-max w-full">
                      <thead>
                        <tr>
                          <Th className="text-left">Customer Name</Th>
                          <Th className="text-left">Contact</Th>
                          <Th className="text-left">DR #</Th>
                          <Th className="text-left">OR #</Th>
                          <Th className="text-left">Product</Th>
                          <Th className="text-left">Condition</Th>
                          <Th className="text-left">Warranty</Th>
                          <Th className="text-left">Category</Th>
                          <Th className="text-left">Subcategory</Th>
                          <Th className="text-center">Qty</Th>
                          <Th className="text-left">Barcode</Th>
                          <Th className="text-right">Value</Th>
                          <Th className="text-left">Sale Person</Th>
                          <Th className="text-left">Date</Th>
                          <Th className="text-right">Cash Paid</Th>
                          <Th className="text-right">Discount</Th>
                          <Th className="text-right">TF Cash</Th>
                          <Th className="text-right">Non-Cash</Th>
                          <Th className="text-left">Ref #</Th>
                          <Th className="text-left">Loan Term</Th>
                          <Th className="text-right">MDR</Th>
                          <Th className="text-right">Receivable</Th>
                          {dynamicPaymentColumns.map((col) => (
                            <Th key={col} className="text-right">{col}</Th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                        {ledgerRows.length === 0 ? (
                          <tr>
                            <td colSpan={22 + dynamicPaymentColumns.length} className="py-8 text-center text-xs text-slate-400">
                              No transactions found
                            </td>
                          </tr>
                        ) : ledgerRows.map((row) => (
                          <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 ${row.rowTone || ""}`}>
                            <Td className="whitespace-nowrap font-semibold text-slate-900 dark:text-slate-100">
                              {row.hideFirstFourColumns ? "" : row.customerName}
                            </Td>
                            <Td className="whitespace-nowrap">{row.hideFirstFourColumns ? "" : row.contactNumber}</Td>
                            <Td className="whitespace-nowrap font-mono">{row.hideFirstFourColumns ? "" : row.drNumber}</Td>
                            <Td>
                              {row.hideFirstFourColumns ? "" : (
                                <button
                                  onClick={() => setTransactionDialogId(row.transactionId)}
                                  className="font-mono text-indigo-600 hover:underline dark:text-indigo-400"
                                >{row.orNumber}</button>
                              )}
                            </Td>
                            <Td className="min-w-[220px]">
                              {row.isRepeatedPaymentRow ? "" : (
                                <span className="font-medium text-slate-900 dark:text-slate-100">{row.productName}</span>
                              )}
                            </Td>
                            <Td className="whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.condition}</Td>
                            <Td className="min-w-[160px]">{row.isRepeatedPaymentRow ? "" : row.warranty}</Td>
                            <Td className="whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.categoryName}</Td>
                            <Td className="whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.subcategoryName}</Td>
                            <Td className="text-center font-semibold">{row.isRepeatedPaymentRow ? "" : row.quantity}</Td>
                            <Td className="whitespace-nowrap font-mono">{row.isRepeatedPaymentRow ? "" : row.barcode}</Td>
                            <Td className="text-right font-semibold tabular-nums whitespace-nowrap">
                              {row.isRepeatedPaymentRow || row.value === null ? "" : formatPHP(row.value)}
                            </Td>
                            <Td className="whitespace-nowrap">{row.isRepeatedPaymentRow ? "" : row.salesPersonName}</Td>
                            <Td className="whitespace-nowrap">
                              {row.isRepeatedPaymentRow ? "" : row.date ? format(new Date(row.date), "MM-dd-yy") : "—"}
                            </Td>
                            <Td className="text-right font-semibold tabular-nums whitespace-nowrap">
                              {row.actualCashPaid === null ? "—" : row.isSplitActualCashPaid ? (
                                <>
                                  {formatPHP(row.actualCashPaid)}
                                  <span className="ml-1 text-[10px] text-emerald-500">(split)</span>
                                </>
                              ) : formatPHP(row.actualCashPaid)}
                            </Td>
                            <Td className="text-right font-semibold tabular-nums whitespace-nowrap">
                              {row.discountAmount > 0
                                ? <span className="text-rose-500">{formatPHP(row.discountAmount)}</span>
                                : "—"}
                            </Td>
                            <Td className="text-right tabular-nums whitespace-nowrap">
                              {row.terminalFeePaidInCash === null ? "—" : formatPHP(row.terminalFeePaidInCash)}
                            </Td>
                            <Td className="text-right tabular-nums whitespace-nowrap">
                              {row.nonCashPaymentAmount === null ? "—" : formatPHP(row.nonCashPaymentAmount)}
                            </Td>
                            <Td className="whitespace-nowrap font-mono">{row.nonCashReferenceNumber}</Td>
                            <Td className="whitespace-nowrap">{row.loanTermLabel}</Td>
                            <Td className="text-right tabular-nums whitespace-nowrap">
                              {row.mdrAmount === null ? "—" : formatPHP(row.mdrAmount)}
                            </Td>
                            <Td className="text-right tabular-nums whitespace-nowrap">
                              {row.receivableAmount === null ? "—" : (
                                <>
                                  {formatPHP(row.receivableAmount)}
                                  <span className="ml-1 text-[10px] text-emerald-500">({row.mdrPercentLabel})</span>
                                </>
                              )}
                            </Td>
                            {dynamicPaymentColumns.map((col) => (
                              <Td
                                key={`${row.id}-${col}`}
                                className={`text-right tabular-nums whitespace-nowrap ${
                                  row.dynamicPaymentAmounts[col] === 0
                                    ? "text-slate-300 dark:text-slate-600"
                                    : "font-semibold text-slate-900 dark:text-slate-100"
                                }`}
                              >
                                {row.dynamicPaymentAmounts[col] === null ? "—" : formatPHP(row.dynamicPaymentAmounts[col])}
                              </Td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>{/* /RIGHT */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction details dialog */}
      <TransactionDetailsDialog
        open={!!transactionDialogId}
        onOpenChange={() => setTransactionDialogId(null)}
        transactionId={transactionDialogId}
        endpoint={transactionDialogId ? route("sales-report.transaction", transactionDialogId) : null}
      />
    </AppShell>
  );
}