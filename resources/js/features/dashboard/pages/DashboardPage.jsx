import AppShell from '@/shared/layouts/AppShell';
import { Head } from '@inertiajs/react';
import { Box, ShoppingCart, TrendingUp, PackageSearch, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

// ─── Formatters ────────────────────────────────────────────────────────────────
const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
});

const compactPesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    notation: 'compact',
    maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-PH');

// ─── Stagger helpers ────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: 'easeOut', delay },
});

// ─── Brand accent colors ────────────────────────────────────────────────────────
const BRAND_COLORS = [
    '#2563EB', '#16A34A', '#D97706', '#DC2626',
    '#7C3AED', '#0891B2', '#CA8A04', '#BE123C',
];

// ─── Tooltip style (shared) ─────────────────────────────────────────────────────
const tooltipStyle = {
    contentStyle: {
        borderRadius: '8px',
        backgroundColor: 'var(--tt-bg)',
        border: '1px solid var(--tt-border)',
        color: 'var(--tt-text)',
        fontSize: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: '8px 12px',
    },
    cursor: { fill: 'var(--tt-cursor)' },
};

// ─── MetricCard ─────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, title, value, subtitle, accent = 'blue' }) {
    const accentMap = {
        blue:   { bg: 'bg-blue-50 dark:bg-blue-950/40',   icon: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-100 dark:border-blue-900' },
        green:  { bg: 'bg-green-50 dark:bg-green-950/40', icon: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900' },
        violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', icon: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900' },
    };
    const a = accentMap[accent];

    return (
        <div className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {title}
                </p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${a.bg} ${a.border} ${a.icon}`}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
            <div>
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {value}
                </p>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
            </div>
        </div>
    );
}

// ─── Panel ──────────────────────────────────────────────────────────────────────
function Panel({ title, subtitle, children, className = '' }) {
    return (
        <section className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
            </div>
            <div className="flex-1 p-5">{children}</div>
        </section>
    );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon = PackageSearch, message = 'No data available', hint }) {
    return (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
            {hint && <p className="max-w-[180px] text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
    );
}

// ─── Shared axis tick ───────────────────────────────────────────────────────────
const AxisTick = ({ fill = 'var(--axis-color)', fontSize = 11, ...rest }) => (
    <text fill={fill} fontSize={fontSize} {...rest} />
);

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage({ summary, charts, tables, period }) {
    const summarySafe = summary ?? { mtdSales: 0, mtdCogs: 0, salesCount: 0 };
    const chartsSafe  = charts  ?? { salesPerDay: [], weeklySales: [], brandSales: [] };
    const tablesSafe  = tables  ?? { topProducts: [], salesRepresentatives: [] };
    const monthLabel  = period?.monthLabel ?? 'Current Month';
    const year        = period?.year ?? '';

    return (
        <>
            {/* CSS variable bridge for light/dark theming in Recharts & tooltips */}
            <style>{`
                :root {
                    --axis-color: #94A3B8;
                    --grid-color: #E2E8F0;
                    --tt-bg: #ffffff;
                    --tt-border: #E2E8F0;
                    --tt-text: #1E293B;
                    --tt-cursor: rgba(148,163,184,0.12);
                }
                .dark {
                    --axis-color: #64748B;
                    --grid-color: #1E293B;
                    --tt-bg: #0F172A;
                    --tt-border: #1E293B;
                    --tt-text: #E2E8F0;
                    --tt-cursor: rgba(148,163,184,0.06);
                }
            `}</style>

            <AppShell title="Dashboard">
                <Head title="Dashboard" />

                {/* Page wrapper — no max-width cap, full bleed */}
                <div className="min-h-screen w-full bg-slate-50 px-4 pb-10 pt-6 dark:bg-slate-950 sm:px-6 lg:px-8">

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <motion.div {...fadeUp(0)} className="mb-6 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                                Dashboard
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Sales performance overview
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {monthLabel} {year}
                        </span>
                    </motion.div>

                    {/* ── Metric Cards ────────────────────────────────────────── */}
                    <motion.div {...fadeUp(0.06)} className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <MetricCard
                            icon={TrendingUp}
                            title="MTD Sales"
                            value={pesoFormatter.format(summarySafe.mtdSales)}
                            subtitle="Month-to-date gross revenue"
                            accent="blue"
                        />
                        <MetricCard
                            icon={Box}
                            title="Cost of Goods"
                            value={pesoFormatter.format(summarySafe.mtdCogs)}
                            subtitle="MTD cost of goods sold"
                            accent="green"
                        />
                        <MetricCard
                            icon={ShoppingCart}
                            title="Transactions"
                            value={numberFormatter.format(summarySafe.salesCount)}
                            subtitle="Total sales transactions this month"
                            accent="violet"
                        />
                    </motion.div>

                    {/* ── Sales per Day + Weekly ───────────────────────────────── */}
                    <motion.div {...fadeUp(0.12)} className="mb-5 grid gap-4 xl:grid-cols-[1.5fr_1fr]">

                        <Panel
                            title={`Daily Sales — ${monthLabel} ${year}`}
                            subtitle="Gross revenue per calendar day"
                        >
                            {chartsSafe.salesPerDay.length === 0 ? (
                                <EmptyState message="No sales recorded this month" hint="Sales will appear here once transactions are logged." />
                            ) : (
                                <div className="h-[260px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartsSafe.salesPerDay}
                                            margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
                                            barCategoryGap="35%"
                                        >
                                            <CartesianGrid
                                                stroke="var(--grid-color)"
                                                strokeDasharray="3 5"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: 'var(--axis-color)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                tick={{ fill: 'var(--axis-color)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => compactPesoFormatter.format(v)}
                                                width={62}
                                            />
                                            <Tooltip
                                                formatter={(v) => [pesoFormatter.format(Number(v) || 0), 'Revenue']}
                                                {...tooltipStyle}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#2563EB" maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Panel>

                        <Panel
                            title="Weekly Sales"
                            subtitle={`Aggregated by week — ${monthLabel} ${year}`}
                        >
                            {chartsSafe.weeklySales.length === 0 ? (
                                <EmptyState message="No weekly data available" />
                            ) : (
                                <div className="h-[260px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartsSafe.weeklySales}
                                            margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
                                            barCategoryGap="40%"
                                        >
                                            <CartesianGrid
                                                stroke="var(--grid-color)"
                                                strokeDasharray="3 5"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: 'var(--axis-color)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fill: 'var(--axis-color)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => compactPesoFormatter.format(v)}
                                                width={62}
                                            />
                                            <Tooltip
                                                formatter={(v) => [pesoFormatter.format(Number(v) || 0), 'Revenue']}
                                                {...tooltipStyle}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#16A34A" maxBarSize={52} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Panel>

                    </motion.div>

                    {/* ── Brand Sales + Top Products + Sales Reps ─────────────── */}
                    <motion.div {...fadeUp(0.18)} className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr_0.9fr]">

                        {/* Brand Sales */}
                        <Panel
                            title="Gross Sales by Brand"
                            subtitle={`${monthLabel} ${year}`}
                        >
                            {chartsSafe.brandSales.length === 0 ? (
                                <EmptyState message="No brand data this month" />
                            ) : (
                                <div className="h-[220px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartsSafe.brandSales}
                                            margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
                                            barCategoryGap="38%"
                                        >
                                            <CartesianGrid
                                                stroke="var(--grid-color)"
                                                strokeDasharray="3 5"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: 'var(--axis-color)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fill: 'var(--axis-color)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => compactPesoFormatter.format(v)}
                                                width={58}
                                            />
                                            <Tooltip
                                                formatter={(v) => [pesoFormatter.format(Number(v) || 0), 'Revenue']}
                                                {...tooltipStyle}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
                                                {chartsSafe.brandSales.map((_, i) => (
                                                    <Cell key={`brand-${i}`} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Panel>

                        {/* Top Products */}
                        <Panel title="Top 10 Products" subtitle={`By revenue — ${monthLabel} ${year}`}>
                            {tablesSafe.topProducts.length === 0 ? (
                                <EmptyState icon={PackageSearch} message="No products sold this month" />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[360px] text-left text-xs" aria-label="Top products">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="pb-2 pl-0 pr-3 font-semibold text-slate-400 dark:text-slate-500">#</th>
                                                <th className="pb-2 pr-3 font-semibold text-slate-400 dark:text-slate-500">Product</th>
                                                <th className="pb-2 pr-3 text-right font-semibold text-slate-400 dark:text-slate-500">Qty</th>
                                                <th className="pb-2 text-right font-semibold text-slate-400 dark:text-slate-500">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {tablesSafe.topProducts.map((product, i) => (
                                                <tr
                                                    key={`${product.name}-${i}`}
                                                    className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                >
                                                    <td className="py-2.5 pl-0 pr-3 text-slate-400 dark:text-slate-500">
                                                        {i < 3 ? (
                                                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                                                i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                                i === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                                           'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                                                            }`}>
                                                                {i + 1}
                                                            </span>
                                                        ) : (
                                                            <span className="pl-1.5 text-slate-400">{i + 1}</span>
                                                        )}
                                                    </td>
                                                    <td className="max-w-[200px] truncate py-2.5 pr-3 font-medium text-slate-700 dark:text-slate-200" title={product.name}>
                                                        {product.name}
                                                    </td>
                                                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                                                        {numberFormatter.format(product.qtySold)}
                                                    </td>
                                                    <td className="py-2.5 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                                                        {pesoFormatter.format(product.revenue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>

                        {/* Sales Representatives */}
                        <Panel title="Sales Representatives" subtitle={`${monthLabel} ${year}`}>
                            {tablesSafe.salesRepresentatives.length === 0 ? (
                                <EmptyState icon={Users} message="No rep data this month" />
                            ) : (
                                <ul className="space-y-1.5">
                                    {tablesSafe.salesRepresentatives.map((rep, i) => {
                                        const max = tablesSafe.salesRepresentatives[0]?.revenue || 1;
                                        const pct = Math.round((rep.revenue / max) * 100);
                                        return (
                                            <li key={`${rep.name}-${i}`} className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                                                        {rep.name}
                                                    </span>
                                                    <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                                                        {pesoFormatter.format(rep.revenue)}
                                                    </span>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div
                                                        className="h-full rounded-full bg-blue-500 transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>

                    </motion.div>

                </div>
            </AppShell>
        </>
    );
}