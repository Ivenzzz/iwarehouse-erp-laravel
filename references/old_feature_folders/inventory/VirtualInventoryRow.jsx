import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye } from "lucide-react";
import { flexRender } from "@tanstack/react-table";

const VirtualInventoryRow = React.memo(function VirtualInventoryRow({
  row,
  virtualRow,
  columns,
}) {
  return (
    <tr
      data-index={virtualRow.index}
      className={[
        "transition-colors",
        "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        row.getIsSelected() ? "bg-sky-50 dark:bg-sky-900/20" : "",
      ].join(" ")}
      style={{
        height: `${virtualRow.size}px`,
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${virtualRow.start}px)`,
        display: "table-row",
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-4 py-0 text-slate-700 dark:text-slate-200"
          style={{ height: `${virtualRow.size}px`, verticalAlign: "middle" }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
});

export default VirtualInventoryRow;