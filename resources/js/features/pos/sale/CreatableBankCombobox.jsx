import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DEFAULT_BANKS = [
  "BDO",
  "BPI",
  "Metrobank",
  "Landbank",
  "PNB",
  "Security Bank",
  "UnionBank",
  "RCBC",
  "Chinabank",
  "EastWest Bank",
  "PSBank",
  "Asia United Bank",
  "Robinsons Bank",
  "Maybank",
  "Citibank",
  "HSBC",
];

export default function CreatableBankCombobox({ value, onValueChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const options = useMemo(() => {
    const names = new Set(DEFAULT_BANKS.concat(value ? [value] : []));

    return Array.from(names)
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ value: name, label: name }));
  }, [value]);

  const trimmedInput = inputValue.trim();
  const canCreate = trimmedInput && !options.some((option) => option.label.toLowerCase() === trimmedInput.toLowerCase());
  const selectedLabel = options.find((option) => option.value === value)?.label || value || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`justify-between w-full px-3 bg-white text-slate-900 border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:bg-[#020617] dark:text-slate-100 dark:border-slate-800 dark:hover:bg-white/5 dark:focus:ring-indigo-500/40 dark:focus:border-indigo-500 ${className}`}
        >
          <span className="truncate text-left flex-1">{selectedLabel || "Select bank..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800"
        align="start"
      >
        <Command className="bg-transparent border-0">
          <CommandInput
            placeholder="Search or type bank name..."
            value={inputValue}
            onValueChange={setInputValue}
            className="text-slate-900 dark:text-slate-100"
          />
          <CommandList className="max-h-64">
            <CommandEmpty className="text-slate-500 dark:text-slate-400 py-2 px-3 text-sm">
              No bank found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value === value ? "" : option.value);
                      setOpen(false);
                      setInputValue("");
                    }}
                    className="text-slate-800 dark:text-slate-100 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-500/10"
                  >
                    <Check
                      className={`mr-2 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 ${isSelected ? "opacity-100" : "opacity-0"}`}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {canCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onValueChange(trimmedInput);
                    setOpen(false);
                    setInputValue("");
                  }}
                  className="text-indigo-600 dark:text-indigo-400 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-500/10"
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  Use "{trimmedInput}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
