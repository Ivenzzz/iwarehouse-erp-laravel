import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const MATCHED = "matched";
export const PENDING = "pending";
export const DISCREPANCY = "discrepancy";

export const STATUS_META = {
  [MATCHED]: {
    label: "Matched",
    badgeClass: "border-success/20 bg-success-muted text-success-muted-foreground",
    icon: CheckCircle2,
  },
  [PENDING]: {
    label: "Pending",
    badgeClass: "border-warning/20 bg-warning-muted text-warning-muted-foreground",
    icon: AlertTriangle,
  },
  [DISCREPANCY]: {
    label: "Discrepancy",
    badgeClass: "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground",
    icon: XCircle,
  },
};

export const CHECK_META = {
  pass: {
    label: "Pass",
    className: "border-success/20 bg-success-muted text-success-muted-foreground",
  },
  fail: {
    label: "Fail",
    className: "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground",
  },
  na: {
    label: "N/A",
    className: "border-border bg-muted text-muted-foreground",
  },
};

export const PAYMENT_META = {
  paid: {
    label: "Paid",
    className: "border-success/20 bg-success-muted text-success-muted-foreground",
  },
  ready: {
    label: "Ready to Pay",
    className: "border-info/20 bg-info-muted text-info-muted-foreground",
  },
  blocked: {
    label: "Blocked",
    className: "border-border bg-muted text-muted-foreground",
  },
};
