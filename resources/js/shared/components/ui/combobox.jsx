import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { cn } from "@/shared/lib/utils"

const ResponsiveText = ({ children, className }) => {
  const containerRef = useRef(null)
  const textRef = useRef(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textSpan = textRef.current

    if (!container || !textSpan) {
      return undefined
    }

    const adjustFontSize = () => {
      textSpan.style.fontSize = "inherit"
      const startSize = parseFloat(window.getComputedStyle(container).fontSize)
      let currentSize = startSize
      const minSize = 9

      while (textSpan.scrollWidth > container.clientWidth && currentSize > minSize) {
        currentSize -= 0.5
        textSpan.style.fontSize = `${currentSize}px`
      }
    }

    adjustFontSize()
    window.addEventListener("resize", adjustFontSize)

    return () => window.removeEventListener("resize", adjustFontSize)
  }, [children])

  return (
    <div
      ref={containerRef}
      className={cn("flex min-w-0 flex-1 items-center overflow-hidden text-left", className)}
    >
      <span ref={textRef} className="whitespace-nowrap">{children}</span>
    </div>
  )
}

function Combobox({
  id,
  value,
  onChange,
  onValueChange,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  disabled = false,
  className,
  renderOption,
  onSearchChange,
  searchValue,
  debounceMs = 0,
  minSearchChars = 0,
  loading = false,
  selectedOption,
  renderSelectedOption,
  footer,
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const handleValueChange = onValueChange ?? onChange
  const isExternalSearch = typeof onSearchChange === "function"
  const effectiveSelectedOption =
    selectedOption || options.find((option) => String(option.value) === String(value))
  const trimmedInputValue = inputValue.trim()
  const meetsMinSearch = trimmedInputValue.length >= minSearchChars
  const groupedOptions = useMemo(() => (
    (meetsMinSearch || !isExternalSearch ? options : []).reduce((groups, option) => {
      const group = option.group ?? ""

      if (!groups[group]) {
        groups[group] = []
      }

      groups[group].push(option)

      return groups
    }, {})
  ), [isExternalSearch, meetsMinSearch, options])

  useEffect(() => {
    if (searchValue !== undefined) {
      setInputValue(searchValue)
    }
  }, [searchValue])

  useEffect(() => {
    if (!isExternalSearch) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      onSearchChange(inputValue)
    }, debounceMs)

    return () => window.clearTimeout(timeoutId)
  }, [debounceMs, inputValue, isExternalSearch, onSearchChange])

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const lowerInput = inputValue.toLowerCase()
      let match = options.find((opt) => opt.label.toLowerCase() === lowerInput)

      if (!match) {
        const filtered = options.filter((opt) => opt.label.toLowerCase().includes(lowerInput))

        if (filtered.length === 1) {
          match = filtered[0]
        }
      }

      if (match) {
        e.preventDefault()
        handleValueChange?.(match.value)
        setOpen(false)
        setInputValue("")

        if (isExternalSearch) {
          onSearchChange("")
        }
      }
    }
  }

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setInputValue("")

      if (isExternalSearch) {
        onSearchChange("")
      }
    }
  }

  const commandEmptyText = loading
    ? "Loading..."
    : !meetsMinSearch
      ? `Type at least ${minSearchChars} character${minSearchChars === 1 ? "" : "s"} to search`
      : emptyText

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between rounded-lg border border-slate-300 bg-white px-3 text-slate-900 shadow-sm hover:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800 dark:hover:bg-[#020617] dark:focus:border-indigo-500 dark:focus:ring-indigo-500/30",
            className
          )}
        >
          {effectiveSelectedOption && renderSelectedOption ? (
            <div className="flex min-w-0 flex-1 items-center overflow-hidden text-left">
              {renderSelectedOption(effectiveSelectedOption)}
            </div>
          ) : (
            <ResponsiveText>
              {effectiveSelectedOption?.label || placeholder}
            </ResponsiveText>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command className="bg-transparent border-0" shouldFilter={!isExternalSearch}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
            className="text-slate-900 dark:text-slate-100"
          />

          <CommandList className="max-h-64">
            <CommandEmpty className="text-slate-500 dark:text-slate-400">
              {commandEmptyText}
            </CommandEmpty>

            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
              <CommandGroup key={group || "options"} heading={group || undefined}>
                {groupOptions.map((option) => {
                  const isSelected = String(value) === String(option.value)
                  const searchableText = option.searchValue || option.label || ""

                  return (
                    <CommandItem
                      key={`${group || "option"}-${option.value}`}
                      value={String(option.value)}
                      keywords={[
                        searchableText,
                        option.label || "",
                        option.group || "",
                        option.description || "",
                        option.searchText || "",
                      ]}
                      onSelect={() => {
                        handleValueChange?.(String(option.value) === String(value) ? "" : option.value)
                        handleOpenChange(false)
                        setInputValue("")

                        if (isExternalSearch) {
                          onSearchChange("")
                        }
                      }}
                      className="data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-500/10"
                    >
                      {renderOption ? renderOption(option, isSelected) : (
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{option.label}</span>
                          {option.description && (
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {option.description}
                            </span>
                          )}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}

            {footer ? (
              <div className="border-t border-slate-200 p-2 dark:border-slate-800">
                {footer}
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox }
