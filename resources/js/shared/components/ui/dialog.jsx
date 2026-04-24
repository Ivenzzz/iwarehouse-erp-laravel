import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";

/**
 * 💡 These keyframes ensure the animation works regardless of Tailwind plugins.
 * Radix waits for these animations to complete before unmounting.
 */
const animationStyles = `
  @keyframes dialog-overlay-show {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes dialog-overlay-hide {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes dialog-content-show {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes dialog-content-hide {
    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    to { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  }
`;

function Dialog(props) {
  return (
    <>
      <style>{animationStyles}</style>
      <DialogPrimitive.Root {...props} />
    </>
  );
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
        // ✅ Apply the keyframes based on Radix state
        "data-[state=open]:animate-[dialog-overlay-show_200ms_ease-out]",
        "data-[state=closed]:animate-[dialog-overlay-hide_200ms_ease-in]",
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
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
        className={cn(
          "fixed left-1/2 top-1/2 z-50",
          "w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100vh-2rem)]",
          "-translate-x-1/2 -translate-y-1/2",
          "flex flex-col overflow-hidden",
          "border border-border bg-background shadow-xl p-1",

          "data-[state=open]:animate-[dialog-content-show_200ms_ease-out]",
          "data-[state=closed]:animate-[dialog-content-hide_200ms_ease-in]",

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
              className="absolute right-3 top-3 opacity-70 transition-opacity hover:opacity-100"
            >
              <XIcon className="size-4" />
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