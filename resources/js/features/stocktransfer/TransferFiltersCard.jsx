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
  counts = {} // Receives the counts
}) {
  
  // Map Tabs to Status Values
  const tabs = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'For Picklist', value: 'draft', count: counts.draft },
    { label: 'To Ship', value: 'to_ship', count: counts.to_ship },
    { label: 'In Transit', value: 'in_transit', count: counts.in_transit },
    { label: 'Overdue Transit', value: 'past_due', icon: AlertCircle, count: counts.past_due, alert: true },
    { label: 'Received', value: 'fully_received', count: counts.fully_received },
    { label: 'Consolidated', value: 'consolidated', count: counts.consolidated },
  ];

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden mb-6">
      
      {/* 1. Primary Filters (Tabs) */}
      <div className="flex border-b border-border bg-muted/40 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          // If Alert Tab has items, make the text red even if not active (to warn user)
          const isWarning = tab.alert && tab.count > 0;
          
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`flex items-center px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              } ${isWarning && !isActive ? 'text-destructive hover:text-destructive' : ''}`}
            >
              {tab.icon && (
                <tab.icon 
                  size={14} 
                  className={`mr-2 ${isActive ? 'text-primary' : isWarning ? 'text-destructive' : 'text-warning'}`} 
                />
              )}
              {tab.label}
              
              {/* Count Badge - Render if count > 0 */}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                   isActive 
                    ? 'bg-primary/10 text-primary' 
                    : isWarning 
                      ? 'bg-destructive-muted text-destructive-muted-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Toolbar: Search & Secondary Filters */}
      <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <Input
            placeholder="Search transfer ID, item, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-background border-border"
          />
        </div>

        {/* Secondary Filters Group */}
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
           {/* Date Filter */}
           <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="h-10 min-w-[130px] bg-background border-border text-muted-foreground">
               <Calendar size={16} className="mr-2 text-muted-foreground"/>
               <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={fromLocationFilter} onValueChange={setFromLocationFilter}>
            <SelectTrigger className="h-10 min-w-[140px] bg-background border-border text-muted-foreground">
               <MapPin size={16} className="mr-2 text-muted-foreground"/>
               <SelectValue placeholder="From Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Origins</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Clear Button (only if filters active) */}
          {(statusFilter !== 'all' || fromLocationFilter !== 'all' || searchTerm) && (
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setStatusFilter('all');
                  setFromLocationFilter('all');
                  setSearchTerm('');
                }}
                className="text-destructive hover:bg-destructive-muted hover:text-destructive"
             >
                <X size={16} />
             </Button>
          )}
        </div>
      </div>
    </div>
  );
}
