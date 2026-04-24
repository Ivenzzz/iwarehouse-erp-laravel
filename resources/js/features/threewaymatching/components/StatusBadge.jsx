import React from "react";
import { Badge } from "@/components/ui/badge";
import { CHECK_META, PAYMENT_META, PENDING, STATUS_META } from "../utils/threeWayMatchingMeta";

export function StatusBadge({ status, className = "" }) {
  const meta = STATUS_META[status] || STATUS_META[PENDING];
  const Icon = meta.icon;

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
