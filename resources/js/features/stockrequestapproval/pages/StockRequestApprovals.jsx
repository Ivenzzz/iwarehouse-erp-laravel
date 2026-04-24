import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AlertMessage } from "@/components/shared/AlertMessage";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import AdminReviewStatsCards from "../components/AdminReviewStatsCards";
import AdminReviewToolbar from "../components/AdminReviewToolbar";
import AdminReviewTableRow from "../components/AdminReviewTableRow";
import ProcessedApprovalRow from "../components/ProcessedApprovalRow";
import PRTableRow from "../components/PRTableRow";
import { BatchApprovalDialog } from "../components/BatchApprovalDialog";
import { printStockRequest } from "@/features/stockrequest/lib/stockRequestPrintService";

const RELOAD_PROPS = ["requests", "pagination", "filters", "kpis", "warehouses", "companyInfo"];

const formatPesoCompact = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `PHP ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `PHP ${(amount / 1000).toFixed(1)}k`;
  return `PHP ${amount.toLocaleString()}`;
};

export default function StockRequestApprovalsPage({
  requests = [],
  pagination = { page: 1, per_page: 10, total: 0, last_page: 1 },
  filters = { search: "", status_tab: "pending", store_id: null, sort: "created_at", direction: "desc", page: 1, per_page: 10 },
  kpis = { pending: 0, approved: 0, declined: 0, total_pending_value: 0, urgent: 0, approval_rate: "N/A" },
  warehouses = [],
  companyInfo = null,
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [activeTab, setActiveTab] = useState(filters.status_tab || "pending");
  const [filterStore, setFilterStore] = useState(filters.store_id ? String(filters.store_id) : "all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [selectedPRIds, setSelectedPRIds] = useState([]);
  const [showBatchApprovalDialog, setShowBatchApprovalDialog] = useState(false);
  const [batchAllocationData, setBatchAllocationData] = useState([]);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", description: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", description: "", onConfirm: null });

  const handlePrintPR = (pr) => {
    printStockRequest({
      request: pr,
      companyInfo: companyInfo || {},
    });
  };

  useEffect(() => {
    setSearchTerm(filters.search || "");
    setActiveTab(filters.status_tab || "pending");
    setFilterStore(filters.store_id ? String(filters.store_id) : "all");
  }, [filters.search, filters.status_tab, filters.store_id]);

  const query = useMemo(() => ({
    search: searchTerm,
    status_tab: activeTab,
    store_id: filterStore === "all" ? null : Number(filterStore),
    sort: filters.sort || "created_at",
    direction: filters.direction || "desc",
    page: filters.page || 1,
    per_page: filters.per_page || 10,
  }), [activeTab, filterStore, filters.direction, filters.page, filters.per_page, filters.sort, searchTerm]);

  const refresh = (overrides = {}) => {
    router.get(route("stock-request-approvals.index"), { ...query, ...overrides }, {
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if ((filters.search || "") !== searchTerm || (filters.status_tab || "pending") !== activeTab || String(filters.store_id ?? "all") !== filterStore) {
        refresh({ page: 1 });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, activeTab, filterStore]);

  const pendingPRs = requests.filter((pr) => pr.status === "pending");
  const approvedPRs = requests.filter((pr) => ["rfq_created", "stock_transfer_created", "split_operation_created"].includes(pr.status));
  const declinedPRs = requests.filter((pr) => pr.status === "declined");

  const toggleSelectAll = () => {
    const ids = pendingPRs.map((pr) => pr.id);
    if (selectedPRIds.length === ids.length && ids.length > 0) {
      setSelectedPRIds([]);
    } else {
      setSelectedPRIds(ids);
    }
  };

  const toggleSelectPR = (prId) => {
    setSelectedPRIds((prev) => prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId]);
  };

  const handleBatchReview = async () => {
    if (selectedPRIds.length === 0) return;

    try {
      const { data } = await axios.post(route("stock-request-approvals.batch-allocation"), {
        stock_request_ids: selectedPRIds,
      });

      const allocations = (data?.allocation_data || []).map((item) => ({
        ...item,
        approvedQty: item.requestedQty,
        transferQty: item.defaultTransfer,
        rfqQty: item.defaultRFQ,
      }));

      setBatchAllocationData(allocations);
      setShowBatchApprovalDialog(true);
    } catch (error) {
      setAlertDialog({
        open: true,
        title: "Error",
        description: error?.response?.data?.message || "Failed to load allocation data.",
      });
    }
  };

  const handleBatchApprove = async (allocations) => {
    setShowBatchApprovalDialog(false);
    try {
      await axios.post(route("stock-request-approvals.batch-approve"), {
        allocations: allocations.map((item) => ({
          srId: item.srId,
          stockRequestItemId: item.stockRequestItemId,
          branchId: item.branchId,
          variantId: item.variantId,
          approvedQty: Number(item.approvedQty || 0),
          transferQty: Number(item.transferQty || 0),
          rfqQty: Number(item.rfqQty || 0),
        })),
      });

      setSelectedPRIds([]);
      setAlertDialog({ open: true, title: "Success", description: "Batch approval completed." });
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
    } catch (error) {
      setAlertDialog({
        open: true,
        title: "Error",
        description: error?.response?.data?.message || "Failed to process batch approval.",
      });
    }
  };

  const handleBatchDecline = async () => {
    setShowBatchApprovalDialog(false);
    try {
      await axios.post(route("stock-request-approvals.batch-decline"), { stock_request_ids: selectedPRIds });
      setSelectedPRIds([]);
      setAlertDialog({ open: true, title: "Success", description: "Selected stock requests were declined." });
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
    } catch (error) {
      setAlertDialog({
        open: true,
        title: "Error",
        description: error?.response?.data?.message || "Failed to decline selected requests.",
      });
    }
  };

  return (
    <AppShell title="Stock Request Approvals">
      <Head title="Stock Request Approvals" />

      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 font-sans text-gray-800 dark:text-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Review</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and process stock requests across branches.</p>
          </div>
        </div>

        <AdminReviewStatsCards
          pendingCount={kpis.pending || 0}
          totalPendingValue={formatPesoCompact(kpis.total_pending_value || 0)}
          urgentCount={kpis.urgent || 0}
          approvalRate={kpis.approval_rate || "N/A"}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); refresh({ status_tab: tab, page: 1 }); }} className="w-full">
            <div className="border-b border-gray-100 dark:border-gray-700 px-6 py-4">
              <div className="flex gap-1 bg-gray-100/80 dark:bg-gray-700/50 p-1 rounded-lg w-fit">
                <button onClick={() => { setActiveTab("pending"); refresh({ status_tab: "pending", page: 1 }); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "pending" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  Pending ({kpis.pending || 0})
                </button>
                <button onClick={() => { setActiveTab("approved"); refresh({ status_tab: "approved", page: 1 }); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "approved" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  Approved ({kpis.approved || 0})
                </button>
                <button onClick={() => { setActiveTab("declined"); refresh({ status_tab: "declined", page: 1 }); }} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "declined" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  Declined ({kpis.declined || 0})
                </button>
              </div>
            </div>

            <TabsContent value="pending" className="mt-0">
              <AdminReviewToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterStore={filterStore}
                setFilterStore={(value) => { setFilterStore(value); refresh({ store_id: value === "all" ? null : Number(value), page: 1 }); }}
                filterDateRange={filterDateRange}
                setFilterDateRange={setFilterDateRange}
                warehouses={warehouses}
                selectedCount={selectedPRIds.length}
                onBatchReview={handleBatchReview}
                onClearSelection={() => setSelectedPRIds([])}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3 w-10"><input type="checkbox" checked={pendingPRs.length > 0 && selectedPRIds.length === pendingPRs.length} onChange={toggleSelectAll} className="rounded border-input bg-background cursor-pointer" /></th>
                      <th className="px-4 py-3 w-10"></th>
                      <th className="px-4 py-3">Request Info</th>
                      <th className="px-4 py-3">Financials</th>
                      <th className="px-4 py-3">Priority / Due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPRs.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-12 text-muted-foreground">No pending stock requests</td></tr>
                    ) : (
                      pendingPRs.map((pr) => (
                        <AdminReviewTableRow
                          key={pr.id}
                          pr={pr}
                          productMasters={[]}
                          productVariants={[]}
                          brands={[]}
                          inventory={[]}
                          isSelected={selectedPRIds.includes(pr.id)}
                          onToggleSelect={() => toggleSelectPR(pr.id)}
                          onPrint={handlePrintPR}
                          showCheckbox
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border text-sm text-muted-foreground">Showing {pendingPRs.length} pending request{pendingPRs.length !== 1 ? "s" : ""}</div>
            </TabsContent>

            <TabsContent value="approved" className="mt-0">
              <AdminReviewToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterStore={filterStore}
                setFilterStore={(value) => { setFilterStore(value); refresh({ store_id: value === "all" ? null : Number(value), page: 1 }); }}
                filterDateRange={filterDateRange}
                setFilterDateRange={setFilterDateRange}
                warehouses={warehouses}
                selectedCount={0}
                onBatchReview={() => {}}
                onClearSelection={() => {}}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead className="bg-muted/50 border-b border-border"><tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"><th className="px-4 py-3 w-10"></th><th className="px-4 py-3 w-10"></th><th className="px-4 py-3">Request Info</th><th className="px-4 py-3">Financials</th><th className="px-4 py-3">Priority / Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody>
                    {approvedPRs.length === 0 ? <tr><td colSpan="7" className="text-center py-12 text-muted-foreground">No approved stock requests found</td></tr> : approvedPRs.map((stockRequest) => (
                      <ProcessedApprovalRow key={stockRequest.id} approval={null} stockRequest={stockRequest} onPrint={handlePrintPR} productMasters={[]} productVariants={[]} brands={[]} linkedRFQ={stockRequest.linked_rfq} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border text-sm text-muted-foreground">Showing {approvedPRs.length} approved request{approvedPRs.length !== 1 ? "s" : ""}</div>
            </TabsContent>

            <TabsContent value="declined" className="mt-0">
              <AdminReviewToolbar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterStore={filterStore}
                setFilterStore={(value) => { setFilterStore(value); refresh({ store_id: value === "all" ? null : Number(value), page: 1 }); }}
                filterDateRange={filterDateRange}
                setFilterDateRange={setFilterDateRange}
                warehouses={warehouses}
                selectedCount={0}
                onBatchReview={() => {}}
                onClearSelection={() => {}}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead className="bg-muted/50 border-b border-border"><tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"><th className="px-4 py-3 w-10"></th><th className="px-4 py-3 w-10"></th><th className="px-4 py-3">Request Info</th><th className="px-4 py-3">Financials</th><th className="px-4 py-3">Priority / Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody>
                    {declinedPRs.length === 0 ? <tr><td colSpan="7" className="text-center py-12 text-muted-foreground">No declined stock requests found</td></tr> : declinedPRs.map((pr) => (
                      <PRTableRow key={pr.id} pr={pr} onPrint={handlePrintPR} productMasters={[]} productVariants={[]} brands={[]} linkedRFQ={pr.linked_rfq} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border text-sm text-muted-foreground">Showing {declinedPRs.length} declined request{declinedPRs.length !== 1 ? "s" : ""}</div>
            </TabsContent>
          </Tabs>
        </div>

        <BatchApprovalDialog
          open={showBatchApprovalDialog}
          onOpenChange={setShowBatchApprovalDialog}
          stockRequests={selectedPRIds.map((id) => requests.find((p) => p.id === id)).filter(Boolean)}
          allocationData={batchAllocationData}
          onConfirm={handleBatchApprove}
          onDecline={handleBatchDecline}
        />

        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => {
            if (!open) setConfirmDialog({ open: false, title: "", description: "", onConfirm: null });
          }}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          confirmText="Confirm"
          variant="destructive"
        />

        <AlertMessage
          open={alertDialog.open}
          onOpenChange={(open) => {
            if (!open) setAlertDialog({ open: false, title: "", description: "" });
          }}
          title={alertDialog.title}
          description={alertDialog.description}
        />
      </div>
    </AppShell>
  );
}
