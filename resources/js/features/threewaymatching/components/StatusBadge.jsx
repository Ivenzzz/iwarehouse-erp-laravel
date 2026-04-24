import React from "react";
import { Badge } from "@/components/ui/badge";
import { CHECK_META, PAYMENT_META, PENDING, STATUS_META } from "../lib/constants";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const STATUS_ICONS = {
  matched: CheckCircle2,
  pending: AlertTriangle,
  discrepancy: XCircle,
};

export function StatusBadge({ status, className = "" }) {
  const meta = STATUS_META[status] || STATUS_META[PENDING];
  const Icon = STATUS_ICONS[status] || STATUS_ICONS[PENDING];

  return (
    <Badge variant="outline" className={`${meta.badgeClass} ${className}`}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

export function CheckBadge({ state, label }) {
  const meta = CHECK_META[state] || CHECK_META.na;

  return (
    <Badge variant="outline" className={`${meta.className} h-6`}>
      {label}: {meta.label}
    </Badge>
  );
}

export function PaymentBadge({ state }) {
  const meta = PAYMENT_META[state] || PAYMENT_META.blocked;
  return (
    <Badge variant="outline" className={meta.className}>
      {meta.label}
    </Badge>
  );
}
