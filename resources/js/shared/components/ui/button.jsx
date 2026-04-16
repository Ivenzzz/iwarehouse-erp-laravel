import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // 🔵 PRIMARY
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80",

        primaryOutline:
          "border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20",

        // ⚪ SECONDARY
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-secondary/70",

        secondaryOutline:
          "border border-secondary text-secondary-foreground hover:bg-secondary/20 dark:hover:bg-secondary/30",

        // ⚫ NEUTRAL
        outline:
          "border border-border bg-background text-foreground hover:bg-muted dark:bg-background dark:hover:bg-muted/50",

        ghost:
          "text-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",

        // 🔴 DESTRUCTIVE
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:bg-destructive/80",

        destructiveOutline:
          "border border-destructive text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20",

        // 🟢 SUCCESS
        success:
          "bg-success text-success-foreground hover:bg-success/90 dark:hover:bg-success/80",

        successOutline:
          "border border-success text-success hover:bg-success/10 dark:hover:bg-success/20",

        // 🔵 INFO
        info:
          "bg-info text-info-foreground hover:bg-info/90 dark:hover:bg-info/80",

        infoOutline:
          "border border-info text-info hover:bg-info/10 dark:hover:bg-info/20",

        // 🟡 WARNING
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 dark:hover:bg-warning/80",

        warningOutline:
          "border border-warning text-warning hover:bg-warning/10 dark:hover:bg-warning/20",

        // 🔗 LINK
        link:
          "text-primary underline-offset-4 hover:underline dark:text-primary",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}, ref) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
})

export { Button, buttonVariants }
