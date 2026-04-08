import { base44 } from "@/api/base44Client";

export async function fetchItemLifecycle(item) {
  const identifier = item.imei1 || item.imei2 || item.serial_number;
  if (!identifier) return [];

  const [
    purchaseOrders,
    deliveryReceipts,
    goodsReceipts,
    salesTransactions,
    rmaTickets,
    rmaSupplierTransfers,
    suppliers,
    customers,
    warehouses,
  ] = await Promise.all([
    base44.entities.PurchaseOrder.list(),
    base44.entities.DeliveryReceipt.list(),
    base44.entities.GoodsReceipt.list(),
    base44.entities.SalesTransaction.list(),
    base44.entities.RMATickets.list(),
    base44.entities.RMASupplierTransfer.list(),
    base44.entities.Supplier.list(),
    base44.entities.Customer.list(),
    base44.entities.Warehouse.list(),
  ]);

  const events = [];

  // 1. Procurement - Find PO with this item
  purchaseOrders.forEach((po) => {
    const items = po.items_json?.items || [];
    const hasItem = items.some((i) => i.product_master_id === item.product_master_id);
    if (hasItem && po.supplier_id) {
      const supplier = suppliers.find((s) => s.id === po.supplier_id);
      events.push({
        type: "procurement",
        date: po.po_date,
        title: "Procurement - Purchase Order",
        details: `Source: ${supplier?.CompanyName || "Unknown Supplier"}`,
        reference: po.po_number,
        referenceLabel: "PO#",
        status: "ordered",
        icon: "package",
      });
    }
  });

  // 2. Inbound - Delivery Receipt
  deliveryReceipts.forEach((dr) => {
    const hasItem = dr.po_id && purchaseOrders.some((po) => {
      const items = po.items_json?.items || [];
      return po.id === dr.po_id && items.some((i) => i.product_master_id === item.product_master_id);
    });
    if (hasItem) {
      events.push({
        type: "inbound",
        date: dr.receipt_info?.receipt_date,
        title: "Inbound - Delivery Receipt",
        details: `Received from courier`,
        reference: dr.receipt_info?.dr_number,
        referenceLabel: "DR#",
        status: "received",
        icon: "truck",
      });
    }
  });

  // 3. Goods Receipt - Item entered into system
  goodsReceipts.forEach((grn) => {
    const items = grn.items || [];
    const hasItem = items.some((i) => {
      const serials = i.serials || [];
      return serials.some((s) => 
        s.imei1 === identifier || 
        s.imei2 === identifier || 
        s.serial_number === identifier
      );
    });
    if (hasItem) {
      const warehouse = warehouses.find((w) => w.id === grn.parties?.warehouse_id);
      events.push({
        type: "goods_receipt",
        date: grn.receipt_info?.receipt_date,
        title: "Goods Receipt - Stock Entry",
        details: `Location: ${warehouse?.name || "Unknown"} | Encoded by ${grn.parties?.received_by || "System"}`,
        reference: grn.receipt_info?.grn_number,
        referenceLabel: "GRN#",
        status: "available",
        icon: "check-circle",
      });
    }
  });

  // 4. Inventory - Current location (if available)
  if (item.encoded_date && item.status === "available") {
    const warehouse = warehouses.find((w) => w.id === item.warehouse_id);
    events.push({
      type: "inventory",
      date: item.encoded_date,
      title: "Inventory - Storage",
      details: `Location: ${warehouse?.name || "Unknown"}`,
      reference: null,
      status: "available",
      icon: "archive",
    });
  }

  // 5. Sales - Find sales transaction
  salesTransactions.forEach((sale) => {
    const items = sale.items || [];
    const hasItem = items.some((i) => 
      i.imei1 === identifier || 
      i.imei2 === identifier || 
      i.serial_number === identifier
    );
    if (hasItem) {
      const customer = customers.find((c) => c.id === sale.customer_id);
      events.push({
        type: "sales",
        date: sale.transaction_date,
        title: "Sales - Sold",
        details: `Customer: ${customer?.full_name || "Walk-in Customer"}`,
        reference: sale.or_number || sale.transaction_number,
        referenceLabel: "OR#",
        status: "sold",
        icon: "shopping-cart",
      });
    }
  });

  // 6. RMA - Customer Return
  rmaTickets.forEach((rma) => {
    const items = rma.items || [];
    const hasItem = items.some((i) => 
      i.imei1 === identifier || 
      i.imei2 === identifier || 
      i.serial_number === identifier
    );
    if (hasItem) {
      events.push({
        type: "rma",
        date: rma.created_date,
        title: "RMA - Customer Return",
        details: `Reason: ${rma.customer_complaint || "N/A"} | Condition: ${rma.oic_triage_data?.overall_condition || "Pending"}`,
        reference: rma.rma_number,
        referenceLabel: "RMA#",
        status: "returned",
        icon: "rotate-ccw",
      });
    }
  });

  // 7. RTV - Return to Supplier
  rmaSupplierTransfers.forEach((rtv) => {
    const items = rtv.items || [];
    const hasItem = items.some((i) => 
      i.imei1 === identifier || 
      i.serial_number === identifier
    );
    if (hasItem) {
      const supplier = suppliers.find((s) => s.id === rtv.supplier_id);
      events.push({
        type: "rtv",
        date: rtv.created_date,
        title: "RTV - Return to Supplier",
        details: `Action: Warranty Claim | Supplier: ${supplier?.CompanyName || "Unknown"}`,
        reference: rtv.transfer_number,
        referenceLabel: "RTV#",
        status: "defective",
        icon: "alert-triangle",
      });
    }
  });

  // Sort by date (oldest to newest)
  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}