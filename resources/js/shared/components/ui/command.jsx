import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Dialog, DialogContent } from "@/shared/components/ui/dialog"

const Command = React.forwardRef(function Command({
  className,
  ...props
}, ref) {
  return (
    <CommandPrimitive
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-transparent text-inherit",
        className
      )}
      {...props} />
  )
})

Command.displayName = CommandPrimitive.displayName

function CommandDialog({
  children,
  ...props
}) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef(function CommandInput({
  className,
  ...props
}, ref) {
  return (
    <div className="flex items-center border-b border-slate-200 px-3 py-2 dark:border-slate-800" cmdk-input-wrapper="">
      <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "flex h-auto w-full border-0 bg-transparent py-0 text-sm text-slate-900 outline-none ring-0 shadow-none placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100 dark:placeholder:text-slate-500",
          className
        )}
        {...props} />
    </div>
  )
})

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef(function CommandList({
  className,
  style,
  ...props
}, ref) {
  const innerRef = React.useRef(null)

  React.useEffect(() => {
    const el = innerRef.current

    if (!el) {
      return undefined
    }

    const handleWheel = (e) => {
      const sizer = el.querySelector("[cmdk-list-sizer]")
      const scrollTarget =
        sizer && sizer.scrollHeight > sizer.clientHeight ? sizer : el

      const { scrollTop, scrollHeight, clientHeight } = scrollTarget
      const maxScroll = scrollHeight - clientHeight

      if (maxScroll > 0) {
        e.preventDefault()
        e.stopPropagation()
        scrollTarget.scrollTop = Math.max(
          0,
          Math.min(maxScroll, scrollTop + e.deltaY)
        )
      }
    }

    el.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    })

    return () => {
      el.removeEventListener("wheel", handleWheel, {
        capture: true,
      })
    }
  }, [])

  return (
    <CommandPrimitive.List
      ref={(node) => {
        innerRef.current = node

        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }}
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden p-1.5", className)}
      style={style}
      {...props} />
  )
})

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef(function CommandEmpty(props, ref) {
  return (
    <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm text-slate-500 dark:text-slate-400" {...props} />
  )
})

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef(function CommandGroup({
  className,
  ...props
}, ref) {
  return (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        "overflow-hidden p-0 text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-slate-400 dark:[&_[cmdk-group-heading]]:text-slate-500",
        className
      )}
      {...props} />
  )
})

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef(function CommandSeparator({
  className,
  ...props
}, ref) {
  return (
    <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
  )
})

CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef(function CommandItem({
  className,
  ...props
}, ref) {
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md px-3 py-2.5 text-sm text-slate-800 outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-indigo-50 data-[selected=true]:text-slate-900 dark:text-slate-100 dark:data-[selected=true]:bg-indigo-500/10 dark:data-[selected=true]:text-slate-100",
        className
      )}
      {...props} />
  )
})

CommandItem.displayName = CommandPrimitive.Item.displayName

function CommandShortcut({
  className,
  ...props
}) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props} />
  )
}

CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
