import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { getStatusLabel } from "../lib/rfqUtils";

export default function RFQFilters({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, rfqs = [] }) {
  // Get unique statuses from actual RFQ data
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(rfqs.map(rfq => rfq.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [rfqs]);

  return (
    <div className="flex items-center gap-4 justify-end">
      <div className="relative w-64">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by RFQ#"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-border bg-background pl-8 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48 border-border bg-background text-foreground">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent className="border-border bg-popover text-popover-foreground">
          <SelectItem value="all">All Status</SelectItem>
          {uniqueStatuses.map(status => (
            <SelectItem key={status} value={status}>
              {getStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
