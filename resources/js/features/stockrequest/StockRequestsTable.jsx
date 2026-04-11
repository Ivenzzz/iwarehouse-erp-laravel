import React, { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Search, Plus, Calendar, Filter } from "lucide-react";
import StockRequestTableRow from "./StockRequestTableRow";
import PaginationControls from "./PaginationControls";
import { getStatusBadgeStyles } from "./stockRequestUtils";

const TABS = ["All", "Pending", "Approved", "Rejected"];

export default function StockRequestsTable({
  paginatedRequests,
  searchTerm,
  onSearchChange,
  onCreateClick,
  stockRequestApprovals = [],
  onPrint,
  pagination,
  activeTab,
  onTabChange,
}) {
  const approvalsByRequestId = useMemo(() => {
    return stockRequestApprovals.reduce((acc, approval) => {
      if (!approval?.sr_id || acc[approval.sr_id]) return acc;
      acc[approval.sr_id] = approval;
      return acc;
    }, {});
  }, [stockRequestApprovals]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Toolbar: Tabs & Search & Create Button */}
      <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100/80 dark:bg-gray-700/50 p-1 rounded-lg w-fit">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right Side Actions: Search, Filters, CREATE BUTTON */}
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
              />
            </div>

            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Calendar size={16} />
            </button>

            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Filter size={16} />
            </button>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 hidden sm:block" />

            <Button
              onClick={onCreateClick}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm text-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Create Request
            </Button>
          </div>
        </div>
      </div>

      <div className="p-0">
        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {paginatedRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                {searchTerm
                  ? "No matching requests found"
                  : "No stock requests yet"}
              </p>
            </div>
          ) : (
            paginatedRequests.map((request) => {
              const approval = approvalsByRequestId[request.id];
              const approvalData = approval?.approval_data || {};
              const totalRequestedItems = (request.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

              return (
                <div
                  key={request.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {request.request_number || `Request #${request.id}`}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {request.branch_name || "Unknown Branch"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusBadgeStyles(request.status)}>
                        {request.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Requested By</p>
                      <p className="">
                        {request.requested_by || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Request Date</p>
                      <p className="">
                        {request.created_at ? format(new Date(request.created_at), "MMM dd, yyyy | hh:mm a") : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Purpose</p>
                      <p className=" line-clamp-1">{request.purpose}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
                      <p className="">{totalRequestedItems}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Approved By: {approvalData.approver_name || "N/A"}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Required:{" "}
                      {request.required_date ? format(new Date(request.required_date), "MMM dd, yyyy | hh:mm a") : "N/A"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4">Request Details</th>
                <th className="px-6 py-4">Branch & Items</th>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Approval Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>
                      {searchTerm
                        ? "No matching requests found"
                        : "No stock requests yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request) => {
                  const approval = approvalsByRequestId[request.id];

                  return (
                    <StockRequestTableRow
                      key={request.id}
                      request={request}
                      approval={approval}
                      onPrint={onPrint}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Responsive */}
        <div className="mt-6 px-6 pb-6 text-gray-900 dark:text-gray-100">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            itemsPerPage={pagination.itemsPerPage}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
            onItemsPerPageChange={pagination.onItemsPerPageChange}
          />
        </div>
      </div>
    </div>
  );
}