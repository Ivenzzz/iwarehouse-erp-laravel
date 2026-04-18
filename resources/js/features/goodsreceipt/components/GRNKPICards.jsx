import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, CheckCircle2, Printer } from "lucide-react";

export default function GRNKPICards({ kpis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Ready for Encoding */}
      <Card className="border border-border bg-accent text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Ready for Encoding
          </CardTitle>
          <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
            <Package className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {kpis.readyForEncoding}
          </div>
          <p className="text-xs text-muted-foreground">Delivery receipts</p>
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card className="border border-border bg-accent text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            In Progress
          </CardTitle>
          <div className="p-1.5 rounded-md bg-info/10 border border-info/20">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--info))]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[hsl(var(--info))]">
            {kpis.encodingInProgress}
          </div>
          <p className="text-xs text-muted-foreground">Being processed</p>
        </CardContent>
      </Card>

      {/* Completed Today */}
      <Card className="border border-border bg-accent text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Completed Today
          </CardTitle>
          <div className="p-1.5 rounded-md bg-success/10 border border-success/20">
            <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[hsl(var(--success))]">
            {kpis.completedToday}
          </div>
          <p className="text-xs text-muted-foreground">GRNs created</p>
        </CardContent>
      </Card>

      {/* Label Accuracy */}
      <Card className="border border-border bg-accent text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Label Accuracy
          </CardTitle>
          <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
            <Printer className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {kpis.accuracy}
          </div>
          <p className="text-xs text-muted-foreground">Target: 100%</p>
        </CardContent>
      </Card>
    </div>
  );
}
