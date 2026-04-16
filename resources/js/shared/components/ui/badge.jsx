import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/shared/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border text-[11px] font-bold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        // Uses your --primary variable
        primary:
          "bg-primary/15 text-primary border-primary/20 hover:bg-primary/25",

        // Uses your --secondary variable
        secondary:
          "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary",

        // Uses your --muted variable
        muted:
          "bg-muted text-muted-foreground border-border hover:bg-muted",

        // Uses your --success variable (Green)
        success:
          "bg-success/15 text-success border-success/25 hover:bg-success/25 hover:border-success/40",

        // Uses your --info variable (Blue/Sky)
        info:
          "bg-info/15 text-info border-info/25 hover:bg-info/25 hover:border-info/40",

        // Uses your --warning variable (Yellow/Orange)
        warning:
          "bg-warning/15 text-warning border-warning/25 hover:bg-warning/25 hover:border-warning/40",

        // Uses your --destructive variable (Red)
        destructive:
          "bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/25 hover:border-destructive/40",

        outline:
          "border-border text-foreground hover:bg-muted",

        ghost:
          "border-transparent text-muted-foreground hover:bg-muted",
      },

      size: {
        xs: "h-4.5 px-1.5 text-[10px] [&>svg]:size-3",
        sm: "h-5 px-2 text-[10px] [&>svg]:size-3",
        default: "h-6 px-2.5 text-[11px] [&>svg]:size-3.5",
        lg: "h-7 px-3 text-xs [&>svg]:size-4",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }