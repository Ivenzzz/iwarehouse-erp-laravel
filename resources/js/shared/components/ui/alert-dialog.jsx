import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { cn } from "@/shared/lib/utils";

function AlertDialog(props) {
  return <AlertDialogPrimitive.Root {...props} />;
}

function AlertDialogTrigger(props) {
  return <AlertDialogPrimitive.Trigger {...props} />;
}

function AlertDialogPortal(props) {
  return <AlertDialogPrimitive.Portal {...props} />;
}

function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px]", className)}
      {...props}
    />
  );
}

function AlertDialogContent({ className, ...props }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }) {
  return <AlertDialogPrimitive.Title className={cn("text-base font-semibold", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }) {
  return <AlertDialogPrimitive.Description className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }) {
  return <div className={cn("flex items-center justify-end gap-3", className)} {...props} />;
}

function AlertDialogCancel(props) {
  return <AlertDialogPrimitive.Cancel {...props} />;
}

function AlertDialogAction(props) {
  return <AlertDialogPrimitive.Action {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
