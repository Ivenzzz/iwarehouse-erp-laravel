import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ... (keep your existing primary, primaryOutline, etc.)
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80",
        primaryOutline: "border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20",
        
        // ✨ NEW: PRIMARY GHOST OUTLINE
        primaryGhostOutline: 
          "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 dark:bg-primary/10 dark:hover:bg-primary/20",

        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-secondary/70",
        secondaryOutline: "border border-secondary text-secondary-foreground hover:bg-secondary/20 dark:hover:bg-secondary/30",

        outline: "border border-border bg-background text-foreground hover:bg-muted dark:bg-background dark:hover:bg-muted/50",
        ghost: "text-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",

        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:bg-destructive/80",
        destructiveOutline: "border border-destructive text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20",
        
        // ✨ NEW: DESTRUCTIVE GHOST OUTLINE
        destructiveGhostOutline: 
          "border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:border-destructive/60 dark:bg-destructive/10 dark:hover:bg-destructive/20",

        success: "bg-success text-success-foreground hover:bg-success/90 dark:hover:bg-success/80",
        successOutline: "border border-success text-success hover:bg-success/10 dark:hover:bg-success/20",
        
        // ✨ NEW: SUCCESS GHOST OUTLINE
        successGhostOutline: 
          "border border-success/30 bg-success/5 text-[hsl(var(--success))] hover:bg-success/15 hover:border-success/60 dark:bg-success/10 dark:hover:bg-success/20",

        info: "bg-info text-info-foreground hover:bg-info/90 dark:hover:bg-info/80",
        infoOutline: "border border-info text-info hover:bg-info/10 dark:hover:bg-info/20",
        
        // ✨ NEW: INFO GHOST OUTLINE
        infoGhostOutline: 
          "border border-info/30 bg-info/5 text-info hover:bg-info/15 hover:border-info/60 dark:bg-info/10 dark:hover:bg-info/20",

        warning: "bg-warning text-warning-foreground hover:bg-warning/90 dark:hover:bg-warning/80",
        warningOutline: "border border-warning text-warning hover:bg-warning/10 dark:hover:bg-warning/20",
        
        // ✨ NEW: WARNING GHOST OUTLINE
        warningGhostOutline: 
          "border border-warning/30 bg-warning/5 text-warning hover:bg-warning/15 hover:border-warning/60 dark:bg-warning/10 dark:hover:bg-warning/20",

        link: "text-primary underline-offset-4 hover:underline dark:text-primary",
      },
      size: {
        // ... keep your existing sizes
        default: "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 px-2 text-xs",
        sm: "h-7 gap-1 px-2.5 text-[0.8rem]",
        lg: "h-9 gap-1.5 px-2.5",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "outline",
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
