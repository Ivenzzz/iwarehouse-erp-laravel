import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";

export function useStockRequestFilters(requests, activeTab = "All") {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter by tab first
  const tabFilteredRequests = useMemo(() => {
    if (activeTab === "All") return requests;
    
    const tabStatusMap = {
      Pending: ["pending", "draft"],
      Approved: ["approved", "approved_by_admin", "approved_with_adjustments", "processing", "converted_to_rfq", "converted_to_po", "waiting_for_supplier_delivery", "preparing_by_warehouse", "picking_by_warehouse", "picked_by_warehouse", "packed_by_warehouse", "in_transit", "branch_transfer_in_transit", "delivered", "received_by_branch", "completed"],
      Rejected: ["rejected", "declined", "cancelled"],
    };
    
    const allowedStatuses = tabStatusMap[activeTab] || [];
    return requests.filter((r) => allowedStatuses.includes(r.status));
  }, [requests, activeTab]);

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return tabFilteredRequests;

    const searchLower = searchTerm.toLowerCase();
    return tabFilteredRequests.filter((request) => {
      if (request.request_number?.toLowerCase().includes(searchLower)) return true;
      if (request.branch_name?.toLowerCase().includes(searchLower)) return true;
      if (request.requested_by?.toLowerCase().includes(searchLower)) return true;
      if (request.purpose?.toLowerCase().includes(searchLower)) return true;

      if (
        request.created_at &&
        format(new Date(request.created_at), "MMMM dd, yyyy | hh:mm a")
          .toLowerCase()
          .includes(searchLower)
      )
        return true;

      const hasMatchingItem = (request.items || []).some((item) => {
        const itemText = [item.brand, item.model, item.variant_name, item.variant_sku].filter(Boolean).join(' ').toLowerCase();
        return itemText.includes(searchLower);
      });

      return hasMatchingItem;
    });
  }, [tabFilteredRequests, searchTerm]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, itemsPerPage]);

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredRequests,
    paginatedRequests,
    totalPages,
  };
}