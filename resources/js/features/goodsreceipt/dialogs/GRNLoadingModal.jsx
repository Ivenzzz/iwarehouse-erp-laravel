import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Package, Circle } from "lucide-react";

export default function GRNLoadingModal({ open, currentStep, steps }) {
  const normalizedSteps = (steps || []).map((step, index) => {
    if (typeof step === "string") {
      return {
        id: `step-${index + 1}`,
        label: step,
        detail: "",
        icon: Circle,
      };
    }

    return {
      id: step?.id || `step-${index + 1}`,
      label: step?.label || `Step ${index + 1}`,
      detail: step?.detail || "",
      icon: step?.icon || Circle,
    };
  });

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg border-border bg-card text-card-foreground"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Goods Receipt Processing</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col py-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <Package className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-card-foreground">Processing Add Items</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait while we save the goods receipt, create inventory, and update the delivery receipt.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            {normalizedSteps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const stateLabel = isCompleted ? "Done" : isCurrent ? "In progress" : "Pending";
              
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCompleted
                      ? "border border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/10"
                      : isCurrent
                        ? "border border-primary/20 bg-primary/10"
                        : "border border-border bg-muted/40"
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-[hsl(var(--success))]"
                      : isCurrent
                        ? "bg-primary"
                        : "bg-muted-foreground/40"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <step.icon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-sm font-medium ${
                        isCompleted
                          ? "text-[hsl(var(--success))]"
                          : isCurrent
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </p>
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isCompleted
                          ? "text-[hsl(var(--success))]"
                          : isCurrent
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}>
                        {stateLabel}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${
                      isCompleted
                        ? "text-[hsl(var(--success))]/80"
                        : isCurrent
                          ? "text-primary/80"
                          : "text-muted-foreground"
                    }`}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
