import React from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MatchDetails from "./MatchDetails";
import MatchList from "./MatchList";

function KpiCard({ icon: Icon, label, value, accentClass, valueSuffix, subtitle, highlighted = false }) {
  return (
    <Card
      className={`overflow-hidden border shadow-none backdrop-blur-sm ${
        highlighted
          ? "border-warning/30 bg-gradient-to-br from-card via-card to-warning-muted/40"
          : "border-border/70 bg-gradient-to-br from-card via-card to-muted/20"
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs ${highlighted ? "text-warning-muted-foreground" : "text-muted-foreground"}`}>{label}</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-xs font-semibold tracking-tight text-foreground">{value}</p>
              {valueSuffix ? <span className="pb-1 text-xs text-info">{valueSuffix}</span> : null}
            </div>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className={`rounded-full border p-3 ${accentClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessTimeline() {
  const stages = [
    { key: "purchase_order", label: "Purchase Order", state: "done" },
    { key: "goods_receipt", label: "Goods Receipt", state: "warning" },
    { key: "invoice", label: "Invoice", state: "idle" },
    { key: "payment", label: "Payment", state: "done" },
  ];

  const getStageClass = (state) => {
    if (state === "done") return "border-success/40 bg-success-muted text-success-muted-foreground";
    if (state === "warning") return "border-warning/40 bg-warning-muted text-warning-muted-foreground";
    return "border-border/80 bg-background/40 text-muted-foreground";
  };

  return (
    <div className="rounded-[28px] border border-border/70 bg-gradient-to-r from-card via-card to-muted/10 px-4 py-5 shadow-none">
      <div className="relative grid grid-cols-4 gap-3">
        <div className="absolute left-[12.5%] right-[12.5%] top-4 h-px bg-border/80" />
        {stages.map((stage) => (
          <div key={stage.key} className="relative flex flex-col items-center gap-3 text-center">
            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${getStageClass(stage.state)}`}>
              {stage.state === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <p className={`text-xs ${stage.key === "payment" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ThreeWayMatchingLayout({
  matches,
  selectedMatch,
  selectedMatchId,
  counts,
  loading,
  error,
  onRefresh,
  onSelectMatch,
  onOpenPaymentDialog,
}) {
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xs font-semibold tracking-tight text-foreground">3-Way Matching</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Validate what was planned, what received, and what the supplier is billing before payment.
          </p>
        </div>
        <Button variant="outline" className="h-11 w-full rounded-xl border-border/70 bg-card/70 px-5 xl:w-auto" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <KpiCard
          icon={AlertTriangle}
          label="Needs Attention"
          value={counts.pendingCount}
          subtitle="Pending Match"
          accentClass="border-warning/30 bg-warning-muted text-warning-muted-foreground"
          highlighted
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value={counts.matchedCount}
          accentClass="border-success/30 bg-success-muted text-success-muted-foreground"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Issues"
          value={counts.discrepancyCount}
          accentClass="border-destructive/30 bg-destructive-muted text-destructive-muted-foreground"
        />
        <KpiCard
          icon={FileSearch}
          label="Performance"
          value={`${counts.matchRate}%`}
          valueSuffix="+10% this week"
          accentClass="border-info/30 bg-info-muted text-info-muted-foreground"
        />
      </div>

      {loading ? (
        <Card className="border-border shadow-none">
          <CardContent className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading three-way matching workspace...</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive-muted shadow-none">
          <CardContent className="flex min-h-[320px] items-center justify-center p-6">
            <div className="max-w-xl text-center">
              <p className="text-xs font-semibold text-destructive-muted-foreground">Unable to load the matching workspace.</p>
              <p className="mt-2 text-xs text-destructive-muted-foreground">
                {error.message || "An unexpected error occurred while loading purchase orders and related documents."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : matches.length === 0 ? (
        <Card className="border-border shadow-none">
          <CardContent className="flex min-h-[320px] items-center justify-center p-6">
            <div className="max-w-xl text-center">
              <p className="text-xs font-semibold text-foreground">No purchase orders found.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Once purchase orders are available, this page will compare them against goods receipts and billed documents.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:h-[calc(100vh-20rem)] xl:min-h-[720px] xl:grid-cols-[320px,minmax(0,1fr)]">
          <MatchList matches={matches} selectedMatchId={selectedMatchId} onSelect={onSelectMatch} />
          <MatchDetails selectedMatch={selectedMatch} onOpenPaymentDialog={onOpenPaymentDialog} />
        </div>
      )}
    </div>
  );
}
