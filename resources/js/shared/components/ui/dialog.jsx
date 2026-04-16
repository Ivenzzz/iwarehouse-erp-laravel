import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";

function Dialog(props) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger(props) {
  return <DialogPrimitive.Trigger {...props} />;
}

function DialogPortal(props) {
  return <DialogPrimitive.Portal {...props} />;
}

const DialogOverlay = React.forwardRef(function DialogOverlay(
  { className, ...props },
  ref
) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",

        // ✅ fade animation
        "transition-opacity duration-200 ease-out",
        "data-[state=open]:opacity-100",
        "data-[state=closed]:opacity-0",

        className
      )}
      {...props}
    />
  );
});

const DialogContent = React.forwardRef(function DialogContent(
  { className, children, showCloseButton = true, ...props },
  ref
) {
  return (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50",
          "w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100vh-2rem)]",
          "-translate-x-1/2 -translate-y-1/2",

          "flex flex-col overflow-hidden",
          "border border-border bg-background shadow-xl p-1",

          // ✅ smooth fade + scale
          "transition-[opacity,transform] duration-200 ease-out",
          "data-[state=open]:opacity-100 data-[state=open]:scale-100",
          "data-[state=closed]:opacity-0 data-[state=closed]:scale-95",

          className
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border mb-2 px-4 py-4",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }) {
  return (
    <div
      className={cn(
        "max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-5",
        className
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-border px-6 py-4",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};