import React from 'react';

import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export default function InventoryItemDialog({
  open,
  onOpenChange,
  items = [],
  warehouseName,
  variantName,
  isLoading = false,
  error = '',
}) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {variantName} - {warehouseName}
            {!isLoading && !error ? (
              <Badge variant="outline" className="ml-2">{items.length} items</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Review reportable inventory units for the selected warehouse cell.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            {isLoading ? (
              <div className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400">Loading items...</div>
            ) : error ? (
              <div className="px-6 py-8 text-sm text-red-600 dark:text-red-300">{error}</div>
            ) : items.length === 0 ? (
              <div className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400">No reportable items found.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Variant Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Condition</th>
                    <th className="px-3 py-2 text-left font-semibold">IMEI/Serial</th>
                    <th className="px-3 py-2 text-right font-semibold">Cost</th>
                    <th className="px-3 py-2 text-right font-semibold">Cash Price</th>
                    <th className="px-3 py-2 text-right font-semibold">SRP</th>
                    <th className="px-3 py-2 text-left font-semibold">Warranty</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/60">
                      <td className="px-3 py-2 font-medium">{item.productName || '-'}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {item.variantCondition || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]">
                        {item.imei1 || item.imei2 || item.serial_number || '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                        &#8369;{Number(item.cost_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                        &#8369;{Number(item.cash_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                        &#8369;{Number(item.srp || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-[10px]">{item.warranty_description || '-'}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            item.status === 'available'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : item.status === 'reserved'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {item.status || 'N/A'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
