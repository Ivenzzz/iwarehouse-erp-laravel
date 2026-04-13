import React from "react";
import { AlertTriangle, DollarSign, Clock, CheckCircle } from "lucide-react";

function StatCard({ icon, value, label, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminReviewStatsCards({
  pendingCount,
  totalPendingValue,
  urgentCount,
  approvalRate,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={<AlertTriangle size={20} />}
        value={pendingCount}
        label="Pending Action"
        color="text-amber-500"
      />
      <StatCard
        icon={<DollarSign size={20} />}
        value={totalPendingValue}
        label="Total Value Pending"
        color="text-primary"
      />
      <StatCard
        icon={<Clock size={20} />}
        value={`${urgentCount} Urgent`}
        label="Requires Immediate Review"
        color="text-rose-500"
      />
      <StatCard
        icon={<CheckCircle size={20} />}
        value={approvalRate}
        label="Approval Rate"
        color="text-emerald-500"
      />
    </div>
  );
}
