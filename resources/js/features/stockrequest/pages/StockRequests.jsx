import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import CreateRequestModal from "../components/CreateRequestModal";
import StockRequestKPIs from "../components/StockRequestKPIs";
import StockRequestsTable from "../components/StockRequestsTable";
import { printStockRequest } from "../lib/stockRequestPrintService";

const RELOAD_PROPS = ["requests", "pagination", "filters", "kpis", "warehouses", "purposes", "companyInfo"];

export default function StockRequestsPage({
  requests = [],
  pagination = { page: 1, per_page: 10, total: 0, last_page: 1 },
  filters = { search: "", status_tab: "All", sort: "created_at", direction: "desc", page: 1, per_page: 10 },
  kpis = { total: 0, pending: 0, approved: 0, rejected: 0 },
  warehouses = [],
  purposes = [],
  companyInfo = {},
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [activeTab, setActiveTab] = useState(filters.status_tab || "All");

  useEffect(() => {
    setSearchTerm(filters.search || "");
    setActiveTab(filters.status_tab || "All");
  }, [filters.search, filters.status_tab]);

  const query = useMemo(() => ({
    search: searchTerm,
    status_tab: activeTab,
    sort: filters.sort || "created_at",
    direction: filters.direction || "desc",
    page: filters.page || 1,
    per_page: filters.per_page || 10,
  }), [activeTab, filters.direction, filters.page, filters.per_page, filters.sort, searchTerm]);

  const refresh = (overrides = {}) => {
    router.get(route("stock-requests.index"), { ...query, ...overrides }, {
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if ((filters.search || "") !== searchTerm || (filters.status_tab || "All") !== activeTab) {
        refresh({ page: 1 });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [activeTab, searchTerm]);

  const handleCreateSubmit = async (data) => {
    await axios.post(route("stock-requests.store"), data);
    setShowCreateModal(false);
    router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
  };

  const handlePrintRequest = (request) => {
    printStockRequest({
      request,
      companyInfo,
    });
  };

  return (
    <AppShell title="Stock Requests">
      <Head title="Stock Requests" />

      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 font-sans text-gray-800 dark:text-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Requests</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track inventory transfer requests across branches.</p>
          </div>
        </div>

        <StockRequestKPIs metrics={kpis} />

        <StockRequestsTable
          requests={requests}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onCreateClick={() => setShowCreateModal(true)}
          onPrint={handlePrintRequest}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            refresh({ status_tab: tab, page: 1 });
          }}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.last_page,
            itemsPerPage: pagination.per_page,
            totalItems: pagination.total,
            onPageChange: (page) => refresh({ page }),
            onItemsPerPageChange: (perPage) => refresh({ page: 1, per_page: perPage }),
          }}
        />

        <CreateRequestModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSubmit={handleCreateSubmit}
          warehouses={warehouses}
          purposes={purposes}
        />
      </div>
    </AppShell>
  );
}
