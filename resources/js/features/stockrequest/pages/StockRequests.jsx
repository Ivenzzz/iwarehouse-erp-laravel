import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CreateRequestModal from "@/components/stockrequest/CreateRequestModal";
import StockRequestKPIs from "@/components/stockrequest/StockRequestKPIs";
import StockRequestsTable from "@/components/stockrequest/StockRequestsTable";
import { useStockRequests } from "@/components/stockrequest/useStockRequests";
import { useStockRequestFilters } from "@/components/stockrequest/useStockRequestFilters";
import { calculateKPIMetrics } from "@/components/stockrequest/stockRequestUtils.jsx";
import { createStockRequest } from "@/components/stockrequest/stockRequestService";
import { printStockRequest } from "@/components/stockrequest/stockRequestPrintService";

export default function StockRequests() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const queryClient = useQueryClient();

  const {
    requests,
    currentUser,
    warehouses,
    stockRequestApprovals,
  } = useStockRequests();

  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredRequests,
    paginatedRequests,
    totalPages,
  } = useStockRequestFilters(requests, activeTab);

  const createRequestMutation = useMutation({
    mutationFn: (data) => createStockRequest(data, currentUser, warehouses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stockRequests"] });
      setShowCreateModal(false);
    },
  });

  const kpiMetrics = calculateKPIMetrics(requests);

  const handlePrintRequest = (request, approval) => {
    printStockRequest({
      request,
      approval,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 font-sans text-gray-800 dark:text-gray-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and track inventory transfer requests across branches.
          </p>
        </div>
      </div>

      <StockRequestKPIs metrics={kpiMetrics} />

      <StockRequestsTable
        paginatedRequests={paginatedRequests}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateClick={() => setShowCreateModal(true)}
        stockRequestApprovals={stockRequestApprovals}
        onPrint={handlePrintRequest}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pagination={{
          currentPage,
          totalPages,
          itemsPerPage,
          totalItems: filteredRequests.length,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
      />

      <CreateRequestModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={(data) => createRequestMutation.mutate(data)}
      />
    </div>
  );
}