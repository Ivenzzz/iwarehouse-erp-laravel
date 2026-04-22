import React, { useState, useMemo } from "react";
import { ArrowLeft, Printer, Receipt, Calendar, User, CreditCard, Search, SlidersHorizontal, X, TrendingUp, Hash, ShoppingBag, ChevronDown } from "lucide-react";
import { format } from "date-fns";

// ─── Mock data for preview ───────────────────────────────────────────────────
const PAYMENT_FILTER_ALL = "All";
const PAYMENT_FILTERS = Object.freeze([PAYMENT_FILTER_ALL]);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const peso = (n) =>
  "₱" + (n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div className="stat-chip" data-accent={accent}>
      <Icon size={13} className="stat-icon" />
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

function TransactionCard({ transaction, onPrint, index }) {
  const [expanded, setExpanded] = useState(false);
  const paymentMethods = (transaction.payments || [])
    .map((p) => p.payment_method)
    .join(" + ");
  const itemCount = (transaction.items || []).length;
  const visibleItems = transaction.items?.slice(0, expanded ? undefined : 2) || [];
  const hiddenCount = itemCount - 2;

  return (
    <div
      className="tx-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Left accent bar */}
      <div className="tx-accent-bar" />

      <div className="tx-body">
        {/* Top row: OR + amount */}
        <div className="tx-top-row">
          <div className="tx-ids">
            <span className="tx-or">{transaction.or_number || "—"}</span>
            <span className="tx-txn">{transaction.transaction_number}</span>
          </div>
          <div className="tx-amount">{peso(transaction.total_amount)}</div>
        </div>

        {/* Meta row */}
        <div className="tx-meta-row">
          <div className="tx-meta-item">
            <Calendar size={12} />
            <span>
              {transaction.transaction_date
                ? format(new Date(transaction.transaction_date), "MMM dd · h:mm a")
                : "—"}
            </span>
          </div>
          <div className="tx-meta-item">
            <User size={12} />
            <span>{transaction.customer_name || "Walk-in Customer"}</span>
          </div>
          <div className="tx-meta-item">
            <CreditCard size={12} />
            <span>{paymentMethods || "—"}</span>
          </div>
          <div className="tx-meta-item">
            <ShoppingBag size={12} />
            <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Items row */}
        <div className="tx-items-row">
          {visibleItems.map((item, i) => (
            <span key={i} className="tx-item-chip">
              {[item.product_name, item.variant_name].filter(Boolean).join(" · ")}
            </span>
          ))}
          {!expanded && hiddenCount > 0 && (
            <button className="tx-more-btn" onClick={() => setExpanded(true)}>
              +{hiddenCount} more <ChevronDown size={10} />
            </button>
          )}
          {expanded && hiddenCount > 0 && (
            <button className="tx-more-btn" onClick={() => setExpanded(false)}>
              Show less
            </button>
          )}
        </div>
      </div>

      {/* Print CTA */}
      <button
        className="tx-print-btn"
        onClick={() => onPrint?.(transaction)}
        title="Print Receipt"
      >
        <Printer size={15} />
        <span>Print</span>
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function POSSessionTransactionsView({
  onClose,
  transactions = [],
  onPrintTransaction,
}) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState(PAYMENT_FILTER_ALL);
  const paymentFilters = useMemo(() => {
    const methods = new Set();

    transactions.forEach((transaction) => {
      (transaction.payments || []).forEach((payment) => {
        if (payment.payment_method) {
          methods.add(payment.payment_method);
        }
      });
    });

    return [...PAYMENT_FILTERS, ...Array.from(methods).sort((a, b) => a.localeCompare(b))];
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (t.or_number || "").toLowerCase().includes(q) ||
        (t.customer_name || "").toLowerCase().includes(q) ||
        (t.transaction_number || "").toLowerCase().includes(q);
      const matchPayment =
        paymentFilter === PAYMENT_FILTER_ALL ||
        (t.payments || []).some((p) =>
          p.payment_method?.toLowerCase().includes(paymentFilter.toLowerCase())
        );
      return matchSearch && matchPayment;
    });
  }, [transactions, search, paymentFilter]);

  const totalSales = transactions.reduce((s, t) => s + (t.total_amount || 0), 0);
  const avgSale = transactions.length ? totalSales / transactions.length : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pos-root {
          --bg: #0d1117;
          --surface: #161b22;
          --surface2: #1c2128;
          --border: #30363d;
          --border-faint: #21262d;
          --text: #e6edf3;
          --text-muted: #7d8590;
          --text-dim: #484f58;
          --teal: #2dd4bf;
          --teal-dim: rgba(45,212,191,0.12);
          --teal-glow: rgba(45,212,191,0.25);
          --amber: #fbbf24;
          --amber-dim: rgba(251,191,36,0.1);
          --red: #f87171;
          --mono: 'IBM Plex Mono', monospace;
          --sans: 'DM Sans', sans-serif;
          font-family: var(--sans);
          background: var(--bg);
          color: var(--text);
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Header ── */
        .pos-header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
          position: relative;
        }
        .pos-header::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, var(--teal) 0%, transparent 60%);
          opacity: 0.5;
        }

        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-muted);
          font-family: var(--sans);
          font-size: 13px;
          font-weight: 500;
          padding: 7px 12px;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .back-btn:hover {
          background: var(--border);
          color: var(--text);
          border-color: var(--teal);
        }

        .header-title-block { flex: 1; min-width: 0; }
        .header-title {
          font-family: var(--mono);
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.02em;
        }
        .header-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        .header-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .stat-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 12px;
          min-width: 100px;
        }
        .stat-chip[data-accent="teal"] { border-color: rgba(45,212,191,0.3); }
        .stat-chip[data-accent="amber"] { border-color: rgba(251,191,36,0.3); }

        .stat-icon { color: var(--text-dim); flex-shrink: 0; }
        .stat-chip[data-accent="teal"] .stat-icon { color: var(--teal); }
        .stat-chip[data-accent="amber"] .stat-icon { color: var(--amber); }

        .stat-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 500;
        }
        .stat-value {
          font-family: var(--mono);
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          margin-top: 1px;
        }
        .stat-chip[data-accent="amber"] .stat-value { color: var(--amber); }
        .stat-chip[data-accent="teal"] .stat-value { color: var(--teal); }

        /* ── Search & Filter Bar ── */
        .filter-bar {
          background: var(--surface);
          border-bottom: 1px solid var(--border-faint);
          padding: 10px 20px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 180px;
          max-width: 380px;
        }
        .search-icon {
          position: absolute;
          left: 11px; top: 50%; transform: translateY(-50%);
          color: var(--text-dim);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: var(--sans);
          font-size: 13px;
          padding: 8px 32px 8px 34px;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input::placeholder { color: var(--text-dim); }
        .search-input:focus { border-color: var(--teal); }
        .search-clear {
          position: absolute;
          right: 9px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--text-dim); padding: 2px;
          display: flex; align-items: center;
        }
        .search-clear:hover { color: var(--text-muted); }

        .filter-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
          flex-shrink: 0;
        }

        .filter-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .filter-pill {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text-muted);
          font-family: var(--sans);
          font-size: 12px;
          font-weight: 500;
          padding: 4px 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .filter-pill:hover { border-color: var(--teal); color: var(--text); }
        .filter-pill.active {
          background: var(--teal-dim);
          border-color: var(--teal);
          color: var(--teal);
        }

        .filter-result-count {
          margin-left: auto;
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text-dim);
          flex-shrink: 0;
        }

        /* ── Scroll body ── */
        .pos-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pos-body::-webkit-scrollbar { width: 5px; }
        .pos-body::-webkit-scrollbar-track { background: transparent; }
        .pos-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

        /* ── Empty state ── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 10px;
          color: var(--text-dim);
          padding: 60px 20px;
        }
        .empty-icon-wrap {
          width: 64px; height: 64px;
          border-radius: 16px;
          background: var(--surface2);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
        }
        .empty-state p:first-of-type { font-size: 14px; font-weight: 500; color: var(--text-muted); }
        .empty-state p:last-of-type { font-size: 12px; }

        /* ── Transaction card ── */
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .tx-card {
          display: flex;
          align-items: stretch;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 0.15s, box-shadow 0.15s;
          animation: cardIn 0.3s ease both;
          position: relative;
        }
        .tx-card:hover {
          border-color: var(--border);
          box-shadow: 0 0 0 1px var(--teal-dim), 0 4px 24px rgba(0,0,0,0.4);
        }

        .tx-accent-bar {
          width: 3px;
          background: linear-gradient(180deg, var(--teal) 0%, transparent 100%);
          flex-shrink: 0;
          opacity: 0.6;
        }
        .tx-card:hover .tx-accent-bar { opacity: 1; }

        .tx-body {
          flex: 1;
          padding: 14px 16px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tx-top-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .tx-ids { display: flex; flex-direction: column; gap: 2px; }
        .tx-or {
          font-family: var(--mono);
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.01em;
        }
        .tx-txn {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }

        .tx-amount {
          font-family: var(--mono);
          font-size: 20px;
          font-weight: 600;
          color: var(--amber);
          letter-spacing: -0.03em;
          flex-shrink: 0;
        }

        .tx-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 16px;
        }
        .tx-meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .tx-meta-item svg { color: var(--text-dim); flex-shrink: 0; }

        .tx-items-row {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          align-items: center;
        }
        .tx-item-chip {
          font-size: 11px;
          background: var(--surface2);
          border: 1px solid var(--border-faint);
          border-radius: 4px;
          color: var(--text-muted);
          padding: 2px 8px;
          font-family: var(--sans);
        }

        .tx-more-btn {
          display: flex; align-items: center; gap: 3px;
          font-size: 11px;
          background: none; border: none; cursor: pointer;
          color: var(--teal);
          font-family: var(--sans);
          padding: 2px 4px;
          border-radius: 4px;
          transition: background 0.12s;
        }
        .tx-more-btn:hover { background: var(--teal-dim); }

        /* ── Print button ── */
        .tx-print-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 18px;
          background: transparent;
          border: none;
          border-left: 1px solid var(--border-faint);
          cursor: pointer;
          color: var(--text-dim);
          font-family: var(--sans);
          font-size: 11px;
          font-weight: 500;
          transition: all 0.15s;
          flex-shrink: 0;
          min-width: 64px;
        }
        .tx-print-btn:hover {
          background: var(--teal-dim);
          color: var(--teal);
          border-left-color: var(--teal);
        }
        .tx-print-btn:active {
          background: var(--teal-glow);
        }

        /* ── Footer ── */
        .pos-footer {
          background: var(--surface);
          border-top: 1px solid var(--border-faint);
          padding: 8px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .footer-hint {
          font-size: 11px;
          color: var(--text-dim);
          font-family: var(--mono);
        }
        .footer-hint kbd {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 10px;
          color: var(--text-muted);
        }
        .footer-session {
          font-size: 11px;
          color: var(--text-dim);
          font-family: var(--mono);
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .pos-header { gap: 10px; flex-wrap: wrap; padding: 12px 14px; }
          .header-stats { gap: 6px; }
          .stat-chip { min-width: 80px; padding: 5px 9px; }
          .stat-value { font-size: 12px; }
          .filter-bar { padding: 8px 14px; }
          .pos-body { padding: 12px 14px; }
          .tx-amount { font-size: 16px; }
          .tx-print-btn { padding: 0 13px; min-width: 52px; }
          .pos-footer { padding: 7px 14px; }
          .filter-result-count { display: none; }
        }
      `}</style>

      <div className="pos-root">
        {/* ── Header ── */}
        <header className="pos-header">
          <button className="back-btn" onClick={onClose}>
            <ArrowLeft size={14} />
            Back
          </button>

          <div className="header-title-block">
            <div className="header-title">Session Transactions</div>
            <div className="header-sub">Current session · Live view</div>
          </div>

          <div className="header-stats">
            <StatChip
              icon={Hash}
              label="Transactions"
              value={transactions.length.toString()}
              accent="teal"
            />
            <StatChip
              icon={TrendingUp}
              label="Total Sales"
              value={peso(totalSales)}
              accent="amber"
            />
            <StatChip
              icon={Receipt}
              label="Avg. Sale"
              value={peso(avgSale)}
              accent="default"
            />
          </div>
        </header>

        {/* ── Filter bar ── */}
        <div className="filter-bar">
          <div className="search-wrap">
            <Search size={13} className="search-icon" />
            <input
              className="search-input"
              placeholder="OR#, customer name, transaction ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="filter-label">
            <SlidersHorizontal size={11} />
            Pay
          </div>
          <div className="filter-pills">
            {paymentFilters.map((f) => (
              <button
                key={f}
                className={`filter-pill ${paymentFilter === f ? "active" : ""}`}
                onClick={() => setPaymentFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="filter-result-count">
            {filtered.length} / {transactions.length}
          </span>
        </div>

        {/* ── Body ── */}
        <main className="pos-body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Receipt size={28} />
              </div>
              <p>{search || paymentFilter !== PAYMENT_FILTER_ALL ? "No matching transactions" : "No transactions yet"}</p>
              <p>
                {search || paymentFilter !== PAYMENT_FILTER_ALL
                  ? "Try adjusting your search or filter"
                  : "Complete a sale to see it here"}
              </p>
            </div>
          ) : (
            filtered.map((t, i) => (
              <TransactionCard
                key={t.id}
                transaction={t}
                onPrint={onPrintTransaction}
                index={i}
              />
            ))
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="pos-footer">
          <span className="footer-hint">
            Press <kbd>ESC</kbd> to return to POS
          </span>
          <span className="footer-session">
            {format(new Date(), "MMM dd, yyyy · h:mm a")}
          </span>
        </footer>
      </div>
    </>
  );
}

