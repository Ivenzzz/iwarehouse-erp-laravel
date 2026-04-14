import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/shared/lib/utils"

function Popover({
  ...props
}) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

const PopoverTrigger = React.forwardRef(function PopoverTrigger({
  ...props
}, ref) {
  return <PopoverPrimitive.Trigger ref={ref} data-slot="popover-trigger" {...props} />;
});

const PopoverContent = React.forwardRef(function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[100] flex w-72 origin-[var(--radix-popover-content-transform-origin)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.16)] outline-none duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100",
          className
        )}
        {...props} />
    </PopoverPrimitive.Portal>
  );
});

function PopoverAnchor({
  ...props
}) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props} />
  );
}

function PopoverTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props} />
  );
}

function PopoverDescription({
  className,
  ...props
}) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
