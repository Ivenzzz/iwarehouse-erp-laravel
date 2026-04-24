import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, MapPin, X, AlertCircle } from "lucide-react";

export default function TransferFiltersCard({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateRangeFilter,
  setDateRangeFilter,
  fromLocationFilter,
  setFromLocationFilter,
  toLocationFilter,
  setToLocationFilter,
  warehouses,
  counts = {}
}) {
  
  const tabs = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'For Picklist', value: 'draft', count: counts.draft },
    { label: 'To Ship', value: 'to_ship', count: counts.to_ship },
    { label: 'In Transit', value: 'in_transit', count: counts.in_transit },
    { label: 'Overdue Transit', value: 'past_due', icon: AlertCircle, count: counts.past_due, alert: true },
    { label: 'Received', value: 'fully_received', count: counts.fully_received },
    { label: 'Consolidated', value: 'consolidated', count: counts.consolidated },
  ];

  const hasActiveFilters = statusFilter !== 'all' || fromLocationFilter !== 'all' || searchTerm || (dateRangeFilter && dateRangeFilter !== 'all');

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden mb-6">
      
      {/* Status Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          const isWarning = tab.alert && tab.count > 0;
          
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`relative flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'text-primary bg-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              } ${isWarning && !isActive ? 'text-destructive hover:text-destructive' : ''}`}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-primary" />
              )}

              {tab.icon && (
                <tab.icon 
                  size={13} 
                  className={isActive ? 'text-primary' : isWarning ? 'text-destructive' : 'text-muted-foreground'} 
                />
              )}
              {tab.label}
              
              {tab.count > 0 && (
                <span className={`min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none text-center ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : isWarning 
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="p-3 flex flex-col sm:flex-row gap-3 items-center bg-muted/20">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={15} className="text-muted-foreground" />
          </div>
          <Input
            placeholder="Search by ID, item, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background border-border text-sm focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="hidden sm:block h-5 w-px bg-border" />

        {/* Secondary Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="h-9 min-w-[130px] bg-background border-border text-sm gap-1.5">
              <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fromLocationFilter} onValueChange={setFromLocationFilter}>
            <SelectTrigger className="h-9 min-w-[140px] bg-background border-border text-sm gap-1.5">
              <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
              <SelectValue placeholder="From Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Origins</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setFromLocationFilter('all');
                setSearchTerm('');
                if (setDateRangeFilter) setDateRangeFilter('all');
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <X size={13} />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
