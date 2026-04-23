import React from "react";
import { Clock, DollarSign, Store, User, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function StartShiftCard({
  cashier,
  shiftWarehouse,
  onShiftWarehouseChange,
  warehouseOptions,
  openingBalance,
  onOpeningBalanceChange,
  isStartingShift,
  onStartShift,
}) {
  return (
    <div className="mx-auto max-w-xl px-2">
      <Card className="overflow-hidden rounded-lg border-0 bg-white shadow-2xl dark:bg-gray-950">
        <div className="bg-indigo-600 px-6 py-6 text-white dark:bg-indigo-500">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90">
              <Clock className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-md font-bold leading-tight">Start DSR</h2>
              <p className="mt-1 text-sm text-white/90">Initialize DSR</p>
            </div>
          </div>
        </div>

        <CardContent className="px-8 py-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="mb-4 flex items-center gap-3">
                <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cashier Information</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Name</p>
                  <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    {cashier?.full_name || "Unknown User"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[15px] font-medium text-slate-800 dark:text-slate-200">
                <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Store Location*</span>
              </Label>

              <Combobox
                value={shiftWarehouse}
                onValueChange={onShiftWarehouseChange}
                options={warehouseOptions}
                placeholder="Select store/branch"
                searchPlaceholder="Search stores/branches..."
                emptyText="No store/branch found"
                className="h-12 rounded-lg border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[15px] font-medium text-slate-800 dark:text-slate-200">
                <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Opening Cash Float*</span>
              </Label>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-500 dark:text-slate-400">
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={openingBalance}
                  onChange={(event) => onOpeningBalanceChange(event.target.value)}
                  placeholder="0.00"
                  className="h-12 rounded-lg border-slate-300 bg-white pl-8 text-[15px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">Amount of cash in the drawer at shift start</p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-5 dark:border-indigo-900/50 dark:bg-indigo-950/40">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-[15px] font-semibold text-indigo-900 dark:text-indigo-200">Shift Start Time</p>
              </div>

              <p className="text-[18px] font-bold text-indigo-950 dark:text-indigo-100">
                {new Date().toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>

            <Button
              onClick={onStartShift}
              disabled={isStartingShift}
              className="h-12 w-full rounded-lg bg-indigo-600 text-base font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isStartingShift ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Shift...
                </>
              ) : (
                "Start Shift"
              )}
            </Button>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              By starting your shift, you confirm the opening balance and store details are correct.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
