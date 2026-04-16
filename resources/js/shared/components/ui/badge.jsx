import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90",

        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",

        muted:
          "bg-muted text-muted-foreground hover:bg-muted/80",

        success:
          "bg-success/10 text-success border border-success/30 hover:bg-success/20",

        info:
          "bg-info/10 text-info border border-info/30 hover:bg-info/20",

        danger:
          "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20",

        destructive:
          "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20",

        outline:
          "border-border text-foreground hover:bg-muted",

        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",

        link:
          "text-primary underline-offset-4 hover:underline",
      },

      // ✅ NEW SIZE VARIANTS
      size: {
        xs: "h-5 px-1.5 text-[10px] [&>svg]:size-3",
        sm: "h-6 px-2 text-xs [&>svg]:size-3",
        default: "h-7 px-2.5 text-xs [&>svg]:size-3.5",
        lg: "h-8 px-3 text-sm [&>svg]:size-4",
      },
    },

    // ✅ DEFAULTS
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }
