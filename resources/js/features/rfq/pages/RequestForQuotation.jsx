import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Head, router } from "@inertiajs/react";
import AppShell from "@/shared/layouts/AppShell";
import { toast } from "@/shared/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Plus, Merge } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRFQPrint } from "../lib/useRFQPrint";
import { useSupplierOptions } from "../lib/rfqUtils";
import { buildAddQuotePayload } from "../lib/rfqService";
import RFQStatsCards from "../components/RFQStatsCards";
import RFQFilters from "../components/RFQFilters";
import RFQTableRow from "../components/RFQTableRow";
import CreateRFQDialog from "../components/dialogs/CreateRFQDialog";
import AddQuoteDialog from "../components/dialogs/AddQuoteDialog";
import CompareQuotesDialog from "../components/dialogs/CompareQuotesDialog";
import ItemsDialog from "../components/dialogs/ItemsDialog";
import ConsolidateRFQDialog from "../components/dialogs/ConsolidateRFQDialog";

const RELOAD_PROPS = ["rfqs", "pagination", "filters", "kpis", "suppliers", "suppliers_count", "ready_stock_requests"];

const createEmptyQuoteForm = () => ({
  supplier_id: "",
  items: [],
  payment_terms: "Net 30",
  eta: null,
  quote_date: format(new Date(), "yyyy-MM-dd"),
  shipping_cost: "",
  tax_amount: "",
});

export default function RequestForQuotationPage({
  rfqs = [],
  pagination = { page: 1, per_page: 10, total: 0, last_page: 1 },
  filters = { search: "", status_tab: "all", sort: "created_at", direction: "desc", page: 1, per_page: 10 },
  kpis = { total_rfqs: 0, receiving_quotes_count: 0, avg_turnaround: 0, converted_count: 0 },
  suppliers = [],
  suppliers_count = 0,
  ready_stock_requests: readyStockRequests = [],
}) {
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [showAddQuoteDialog, setShowAddQuoteDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showItemsDialog, setShowItemsDialog] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [selectedStockRequest, setSelectedStockRequest] = useState(null);
  const [selectedRFQItems, setSelectedRFQItems] = useState(null);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [statusFilter, setStatusFilter] = useState(filters.status_tab || "all");
  const [sortConfig, setSortConfig] = useState({ key: filters.sort || "created_at", direction: filters.direction || "desc" });
  const [activeTab, setActiveTab] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", description: "", onConfirm: null });
  const [showConsolidateDialog, setShowConsolidateDialog] = useState(false);
  const [quoteForm, setQuoteForm] = useState(createEmptyQuoteForm());

  const companyInfo = { company_name: "iWarehouse Corp." };
  const { handlePrintRFQ } = useRFQPrint({ companyInfo });
  const supplierOptions = useSupplierOptions(suppliers);
  const hasSuppliers = suppliers_count > 0;

  useEffect(() => {
    setSearchTerm(filters.search || "");
    setStatusFilter(filters.status_tab || "all");
    setSortConfig({ key: filters.sort || "created_at", direction: filters.direction || "desc" });
  }, [filters.direction, filters.search, filters.sort, filters.status_tab]);

  const query = useMemo(() => ({
    search: searchTerm,
    status_tab: statusFilter,
    sort: sortConfig.key,
    direction: sortConfig.direction,
    page: filters.page || 1,
    per_page: filters.per_page || 10,
  }), [filters.page, filters.per_page, searchTerm, sortConfig.direction, sortConfig.key, statusFilter]);

  const refresh = (overrides = {}) => {
    router.get(route("request-for-quotations.index"), { ...query, ...overrides }, {
      only: RELOAD_PROPS,
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if ((filters.search || "") !== searchTerm || (filters.status_tab || "all") !== statusFilter) {
        refresh({ page: 1 });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter]);

  const consolidatedRFQs = rfqs.filter((r) => r.status === "consolidated");
  const nonConsolidatedRFQs = rfqs.filter((r) => r.status !== "consolidated");

  const handleStatClick = (filterStatus) => {
    setStatusFilter(filterStatus);
    refresh({ status_tab: filterStatus, page: 1 });
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    refresh({ sort: key, direction, page: 1 });
  };

  const handleCreateRFQ = (stockRequest) => {
    setSelectedStockRequest(stockRequest);
    setShowRFQDialog(true);
  };

  const handleSubmitRFQ = async () => {
    if (!selectedStockRequest?.id) return;

    setIsSubmitting(true);
    try {
      await axios.post(route("request-for-quotations.create-from-approval"), {
        stock_request_id: selectedStockRequest.id,
      });
      toast({ title: "Success", description: "RFQ created successfully." });
      setShowRFQDialog(false);
      setSelectedStockRequest(null);
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error?.response?.data?.message || "Failed to create RFQ" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuote = (rfq) => {
    setSelectedRFQ(rfq);
    const rfqItems = rfq.items?.items || [];
    setQuoteForm({
      ...createEmptyQuoteForm(),
      items: rfqItems.map((item) => ({
        rfq_item_id: item.id,
        variant_id: item.variant_id || "",
        brand: item.brand || "",
        model: item.model || "",
        variant_sku: item.variant_sku || "",
        variant_name: item.variant_name || "",
        condition: item.condition || "",
        attributes: item.attributes || {},
        quantity: item.quantity,
        unit_price: "",
        discount: 0,
        total_price: 0,
      })),
    });
    setShowAddQuoteDialog(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedRFQ?.id) return;

    setIsSubmitting(true);
    try {
      const payload = buildAddQuotePayload(selectedRFQ.id, quoteForm);
      await axios.post(route("request-for-quotations.add-supplier-quote"), payload);
      toast({ title: "Success", description: "Supplier quote added successfully." });
      setShowAddQuoteDialog(false);
      setQuoteForm(createEmptyQuoteForm());
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error?.response?.data?.message || "Failed to add quote" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAwardRFQ = async (rfq, winningSupplierId) => {
    const supplierQuotes = rfq.supplier_quotes?.supplier_quotes || [];
    const winningQuote = supplierQuotes.find((q) => q.supplier_id === winningSupplierId);
    if (!winningQuote?.id) {
      toast({ variant: "destructive", title: "Error", description: "Cannot award RFQ: supplier quote was not found." });
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Award RFQ",
      description: "Award this RFQ and create a Purchase Order?",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await axios.post(route("request-for-quotations.award"), {
            rfq_id: rfq.id,
            supplier_quote_id: winningQuote.id,
          });
          toast({ title: "Success", description: "RFQ awarded successfully." });
          setShowCompareDialog(false);
          router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
        } catch (error) {
          toast({ variant: "destructive", title: "Error", description: error?.response?.data?.message || "Failed to award RFQ" });
        } finally {
          setIsSubmitting(false);
          setConfirmDialog({ open: false, title: "", description: "", onConfirm: null });
        }
      },
    });
  };

  const handleEmail = (rfq) => {
    toast({ title: "Email", description: `Email prepared for ${rfq.rfq_number}. Opening mail client...` });
    const subject = `Request for Quotation - ${rfq.rfq_number}`;
    const body = "Dear Supplier,%0D%0A%0D%0APlease provide a quote for the requested items.%0D%0A%0D%0AThank you.";
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCompare = (rfq) => { setSelectedRFQ(rfq); setShowCompareDialog(true); };

  const handleConsolidateRFQs = async (selectedIds) => {
    setIsSubmitting(true);
    try {
      await axios.post(route("request-for-quotations.consolidate"), {
        rfq_ids: selectedIds,
      });
      toast({ title: "Success", description: "RFQs consolidated successfully." });
      setShowConsolidateDialog(false);
      router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error?.response?.data?.message || "Failed to consolidate RFQs" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRFQRows = (rows) => {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan="9" className="py-8 text-center text-muted-foreground">No RFQs found</td>
        </tr>
      );
    }
    return rows.map((rfq) => (
      <RFQTableRow
        key={rfq.id}
        rfq={rfq}
        onPrint={handlePrintRFQ}
        onCompare={handleCompare}
        onAddQuote={handleAddQuote}
        onEmail={handleEmail}
      />
    ));
  };

  return (
    <AppShell title="Request for Quotation">
      <Head title="Request for Quotation" />
      <div className="space-y-6 p-4 text-foreground md:p-6">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Request for Quotation</h2>
            <p className="mt-1 text-muted-foreground">Get quotes from suppliers</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowConsolidateDialog(true)} variant="secondary" className="border-border bg-secondary text-secondary-foreground hover:bg-accent">
              <Merge className="mr-2 h-4 w-4" />
              Consolidate Items
            </Button>
            <Button onClick={() => router.reload({ only: RELOAD_PROPS, preserveScroll: true, preserveState: true })} variant="outline" className="border-border bg-background text-foreground hover:bg-accent">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <RFQStatsCards
          totalRFQs={kpis.total_rfqs}
          receivingQuotesCount={kpis.receiving_quotes_count}
          avgTurnaround={kpis.avg_turnaround}
          convertedCount={kpis.converted_count}
          onFilterChange={handleStatClick}
        />

        {readyStockRequests.length > 0 && (
          <Card className="border-border bg-muted/40">
            <CardHeader>
              <CardTitle className="text-foreground">Approved Stock Requests Ready for RFQ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {readyStockRequests.map((sr) => (
                  <div key={sr.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="font-semibold text-foreground">{sr.request_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {sr.purpose || "Stock Request"} - {sr.items?.length || 0} items
                      </p>
                    </div>
                    <Button onClick={() => handleCreateRFQ(sr)} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-1 h-4 w-4" />
                      Create RFQ
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">Requests for Quotation</CardTitle>
              <RFQFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={(value) => { setStatusFilter(value); refresh({ status_tab: value, page: 1 }); }} rfqs={rfqs} />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 border border-border bg-muted/60">
                <TabsTrigger value="all">All RFQs ({nonConsolidatedRFQs.length})</TabsTrigger>
                <TabsTrigger value="consolidated">Consolidated ({consolidatedRFQs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[1400px] text-xs">
                    <thead className="border-b border-border bg-muted/70">
                      <tr>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">RFQ Number</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Items</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Requested By</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Approved By</th>
                        <th className="cursor-pointer px-2 py-3 text-left font-semibold text-muted-foreground hover:bg-accent/70 md:px-4" onClick={() => handleSort("created_at")}>Created Date</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Required By</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Quotes</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Status</th>
                        <th className="px-2 py-3 text-right font-semibold text-muted-foreground md:px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>{renderRFQRows(nonConsolidatedRFQs)}</tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="consolidated">
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[1400px] text-xs">
                    <thead className="border-b border-border bg-muted/70">
                      <tr>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">RFQ Number</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Items</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Requested By</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Approved By</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Created Date</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Required By</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Quotes</th>
                        <th className="px-2 py-3 text-left font-semibold text-muted-foreground md:px-4">Status</th>
                        <th className="px-2 py-3 text-right font-semibold text-muted-foreground md:px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>{renderRFQRows(consolidatedRFQs)}</tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <CreateRFQDialog
          open={showRFQDialog}
          onOpenChange={setShowRFQDialog}
          selectedStockRequest={selectedStockRequest}
          onSubmit={handleSubmitRFQ}
          isSubmitting={isSubmitting}
        />

        <AddQuoteDialog
          open={showAddQuoteDialog}
          onOpenChange={setShowAddQuoteDialog}
          selectedRFQ={selectedRFQ}
          quoteForm={quoteForm}
          setQuoteForm={setQuoteForm}
          supplierOptions={supplierOptions}
          hasSuppliers={hasSuppliers}
          onSubmit={handleSubmitQuote}
          isSubmitting={isSubmitting}
        />

        <CompareQuotesDialog
          open={showCompareDialog}
          onOpenChange={setShowCompareDialog}
          selectedRFQ={selectedRFQ}
          onAward={handleAwardRFQ}
        />

        <ItemsDialog
          open={showItemsDialog}
          onOpenChange={setShowItemsDialog}
          selectedRFQItems={selectedRFQItems}
        />

        <ConsolidateRFQDialog
          open={showConsolidateDialog}
          onOpenChange={setShowConsolidateDialog}
          rfqs={rfqs}
          onConfirm={handleConsolidateRFQs}
          isSubmitting={isSubmitting}
        />

        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => {
            if (!open) setConfirmDialog({ open: false, title: "", description: "", onConfirm: null });
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AppShell>
  );
}
