import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function ImportDoneStep({ result, onClose }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-5">
      <div className="w-16 h-16 rounded-full bg-success/10 border-2 border-success/40 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]" />
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Purchase Import Complete</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>DR Number: <span className="text-primary">{result?.drNumber}</span></p>
          <p>GRN Number: <span className="text-primary">{result?.grnNumber}</span></p>
          <p>Items Added: <span className="text-[hsl(var(--success))]">{result?.itemCount}</span></p>
        </div>
      </div>

      <Button onClick={onClose} className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2">
        Done
      </Button>
    </div>
  );
}
