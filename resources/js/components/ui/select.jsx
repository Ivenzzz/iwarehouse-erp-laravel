import * as React from "react";

import { cn } from "@/shared/lib/utils";

const SelectContext = React.createContext(null);
const SelectValueContext = React.createContext({ placeholder: "" });

function extractItems(children) {
  const items = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (child.type?.displayName === "SelectItem") {
      items.push({
        value: child.props.value,
        label: typeof child.props.children === "string" ? child.props.children : child.props.children?.toString?.() ?? "",
      });
      return;
    }

    if (child.props?.children) {
      items.push(...extractItems(child.props.children));
    }
  });

  return items;
}

function Select({ value, onValueChange, children }) {
  const items = React.useMemo(() => extractItems(children), [children]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, items }}>
      {children}
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children }) {
  const context = React.useContext(SelectContext);
  const valueMeta = React.useMemo(() => {
    let placeholder = "";

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type?.displayName === "SelectValue") {
        placeholder = child.props.placeholder ?? "";
      }
    });

    return { placeholder };
  }, [children]);

  const current = context?.items?.find((item) => item.value?.toString() === context?.value?.toString());

  return (
    <SelectValueContext.Provider value={valueMeta}>
      <div className={cn("relative flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background", className)}>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type?.displayName === "SelectValue") {
              return (
                <span className={cn("truncate", current ? "text-foreground" : "text-muted-foreground")}>
                  {current?.label || child.props.placeholder}
                </span>
              );
            }

            return child;
          })}
        </div>
        <select
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={context?.value ?? ""}
          onChange={(event) => context?.onValueChange?.(event.target.value)}
        >
          {!current && valueMeta.placeholder ? <option value="">{valueMeta.placeholder}</option> : null}
          {context?.items?.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </SelectValueContext.Provider>
  );
}

function SelectValue() {
  return null;
}

function SelectContent() {
  return null;
}

function SelectItem() {
  return null;
}

SelectTrigger.displayName = "SelectTrigger";
SelectValue.displayName = "SelectValue";
SelectContent.displayName = "SelectContent";
SelectItem.displayName = "SelectItem";

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
