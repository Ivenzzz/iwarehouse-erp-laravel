import { useMemo } from "react";

import { QRStickerPreview } from "@/shared/services/qrStickerPrintService";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Separator } from "@/shared/components/ui/separator";
import { formatCurrency, formatDateTime, getStatusColor } from "@/features/inventory/lib/inventoryUtils";

function LabelValue({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 text-xs">
      <div className="font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="break-words text-slate-900 dark:text-slate-100">{value || "-"}</div>
    </div>
  );
}

export default function InventoryItemDetailsDialog({
  open,
  onOpenChange,
  item,
  productMasters = [],
  variants = [],
  brands = [],
  categories = [],
  subcategories = [],
  warehouses = [],
}) {
  const productMaster = useMemo(
    () => productMasters.find((entry) => entry.id === item?.product_master_id),
    [item, productMasters],
  );
  const variant = useMemo(
    () => variants.find((entry) => entry.id === item?.variant_id),
    [item, variants],
  );
  const brand = useMemo(
    () => brands.find((entry) => entry.id === productMaster?.brand_id),
    [brands, productMaster],
  );
  const category = useMemo(
    () => categories.find((entry) => entry.id === productMaster?.category_id),
    [categories, productMaster],
  );
  const subcategory = useMemo(
    () => subcategories.find((entry) => entry.id === productMaster?.subcategory_id),
    [subcategories, productMaster],
  );
  const warehouse = useMemo(
    () => warehouses.find((entry) => entry.id === item?.warehouse_id),
    [item, warehouses],
  );

  const attributes = variant?.attributes || item?._variantAttributes || {};
  const identifier = item?.imei1 || item?.imei2 || item?.serial_number || "";
  const headerTitle = [brand?.name, productMaster?.model, variant?.variant_name].filter(Boolean).join(" ");
  const specLines = [
    [attributes.ram || attributes.RAM, attributes.storage || attributes.Storage || attributes.rom || attributes.ROM].filter(Boolean).join("/"),
    attributes.color || attributes.Color || item?.purchase_file_data?.color || "",
    [item?.cpu, item?.gpu].filter(Boolean).join(" | "),
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Inventory Item Details</DialogTitle>
          <DialogDescription>
            Review the inventory record, pricing, current location, and activity log.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {!item ? null : (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {headerTitle || "Inventory Item"}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {identifier || "No identifier"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusColor(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
                      {variant?.condition ? <Badge variant="outline">{variant.condition}</Badge> : null}
                      {warehouse?.name ? <Badge variant="outline">{warehouse.name}</Badge> : null}
                    </div>
                  </div>
                  <QRStickerPreview
                    className="self-start"
                    brand={brand?.name}
                    model={productMaster?.model}
                    specLines={specLines}
                    condition={variant?.condition}
                    warrantyLines={item.warranty_description ? item.warranty_description.split(",").map((value) => value.trim()).filter(Boolean) : []}
                    cashPrice={item.cash_price}
                    srp={item.srp}
                    identifier={identifier}
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">General Information</div>
                    <div className="space-y-2">
                      <LabelValue label="Brand" value={brand?.name} />
                      <LabelValue label="Model" value={productMaster?.model} />
                      <LabelValue label="Variant" value={variant?.variant_name} />
                      <LabelValue label="Category" value={category?.name} />
                      <LabelValue label="Subcategory" value={subcategory?.name} />
                      <LabelValue label="Warehouse" value={warehouse?.name} />
                      <LabelValue label="IMEI 1" value={item.imei1} />
                      <LabelValue label="IMEI 2" value={item.imei2} />
                      <LabelValue label="Serial Number" value={item.serial_number} />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Specifications</div>
                    <div className="space-y-2">
                      <LabelValue label="Condition" value={variant?.condition || item.purchase_file_data?.condition} />
                      <LabelValue label="RAM" value={attributes.ram || attributes.RAM} />
                      <LabelValue label="ROM" value={attributes.storage || attributes.Storage || attributes.rom || attributes.ROM} />
                      <LabelValue label="Color" value={attributes.color || attributes.Color || item.purchase_file_data?.color} />
                      <LabelValue label="CPU" value={item.cpu || productMaster?.fixed_specifications?.platform_cpu} />
                      <LabelValue label="GPU" value={item.gpu || productMaster?.fixed_specifications?.platform_gpu} />
                      <LabelValue label="RAM Type" value={item.ram_type || item.purchase_file_data?.ram_type} />
                      <LabelValue label="ROM Type" value={item.rom_type || item.purchase_file_data?.rom_type} />
                      <LabelValue label="RAM Slots" value={item.ram_slots || item.purchase_file_data?.ram_slots} />
                      <LabelValue label="Resolution" value={item.resolution || item.purchase_file_data?.resolution} />
                      <LabelValue label="Warranty" value={item.warranty_description} />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pricing And Traceability</div>
                    <div className="space-y-2">
                      <LabelValue label="Cost Price" value={formatCurrency(item.cost_price)} />
                      <LabelValue label="Cash Price" value={formatCurrency(item.cash_price)} />
                      <LabelValue label="SRP" value={formatCurrency(item.srp)} />
                      <LabelValue label="GRN Number" value={item.grn_number} />
                      <LabelValue label="Purchase Reference" value={item.purchase} />
                      <LabelValue label="Encoded Date" value={formatDateTime(item.encoded_date)} />
                      <LabelValue label="Created Date" value={formatDateTime(item.created_date)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Activity Log</div>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      {item.logs?.length ? item.logs.map((log) => (
                        <div key={log.id} className="space-y-1 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline">{log.action}</Badge>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatDateTime(log.timestamp)}
                            </div>
                          </div>
                          {log.notes ? <div className="text-sm text-slate-700 dark:text-slate-300">{log.notes}</div> : null}
                          {log.actor_name ? <div className="text-[11px] text-slate-500 dark:text-slate-400">By {log.actor_name}</div> : null}
                        </div>
                      )) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No activity log entries.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
