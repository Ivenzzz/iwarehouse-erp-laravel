import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronLeft, Construction, ShieldCheck } from "lucide-react";

export default function POSReturnsView({ onClose }) {
  return (
    <div className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Returns / RMA</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Press ESC or use the button below to go back to POS.</p>
            </div>
            <Button variant="outline" onClick={onClose}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to POS
            </Button>
          </div>

          <div className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <Construction className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-300">Returns module is under Laravel migration</p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                  Legacy Base44 dependencies and missing RMA intake components are temporarily disabled to keep POS stable.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  POS Stability Protected
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  F5 route remains accessible without crashing the app.
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Feature Temporarily Limited
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Full intake flow will be re-enabled after Laravel-native RMA endpoints/components are added.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400">
              Return to POS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
