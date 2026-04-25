import * as React from "react";

import { cn } from "@/shared/lib/utils";

const SelectContext = React.createContext(null);

function extractItems(children) {
  const items = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type?.displayName === "SelectItem") {
      items.push({
        value: child.props.value,
        label:
          typeof child.props.children === "string"
            ? child.props.children
            : child.props.children?.toString?.() ?? "",
        children: child.props.children,
        disabled: child.props.disabled ?? false,
      });

      return;
    }

    if (child.props?.children) {
      items.push(...extractItems(child.props.children));
    }
  });

  return items;
}

function extractContentClassName(children) {
  let className = "";

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type?.displayName === "SelectContent") {
      className = child.props.className ?? "";
      return;
    }

    if (child.props?.children) {
      const nestedClassName = extractContentClassName(child.props.children);
      if (nestedClassName) className = nestedClassName;
    }
  });

  return className;
}

function Select({ value, onValueChange, children, disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);

  const items = React.useMemo(() => extractItems(children), [children]);
  const contentClassName = React.useMemo(
    () => extractContentClassName(children),
    [children]
  );

  const current = React.useMemo(
    () => items.find((item) => item.value?.toString() === value?.toString()),
    [items, value]
  );

  React.useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectValue = React.useMemo(
    () => ({
      value,
      onValueChange,
      disabled,
      open,
      setOpen,
      items,
      current,
      contentClassName,
      rootRef,
    }),
    [value, onValueChange, disabled, open, items, current, contentClassName]
  );

  return (
    <SelectContext.Provider value={selectValue}>
      <div ref={rootRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children, disabled: triggerDisabled }) {
  const context = React.useContext(SelectContext);

  const placeholder = React.useMemo(() => {
    let placeholderText = "";

    React.Children.forEach(children, (child) => {
      if (
        React.isValidElement(child) &&
        child.type?.displayName === "SelectValue"
      ) {
        placeholderText = child.props.placeholder ?? "";
      }
    });

    return placeholderText;
  }, [children]);

  const disabled = context?.disabled || triggerDisabled;

  const handleSelect = (item) => {
    if (item.disabled) return;

    context?.onValueChange?.(item.value);
    context?.setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={context?.open ?? false}
        onClick={() => {
          if (!disabled) context?.setOpen((open) => !open);
        }}
        className={cn(
          "relative flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm",
          "ring-offset-background transition-colors",
          "placeholder:text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
          {React.Children.map(children, (child) => {
            if (
              React.isValidElement(child) &&
              child.type?.displayName === "SelectValue"
            ) {
              return (
                <span
                  className={cn(
                    "truncate",
                    context?.current
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {context?.current?.children ||
                    context?.current?.label ||
                    placeholder}
                </span>
              );
            }

            return child;
          })}
        </div>

        <svg
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            context?.open && "rotate-180"
          )}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {context?.open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95",
            context.contentClassName
          )}
        >
          {context.items.length > 0 ? (
            context.items.map((item) => {
              const selected =
                item.value?.toString() === context.value?.toString();

              return (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={item.disabled}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors",
                    "text-popover-foreground",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    "disabled:pointer-events-none disabled:opacity-50",
                    selected && "bg-primary text-primary-foreground"
                  )}
                >
                  <span className="truncate">{item.children || item.label}</span>
                </button>
              );
            })
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No options found.
            </div>
          )}
        </div>
      )}
    </>
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