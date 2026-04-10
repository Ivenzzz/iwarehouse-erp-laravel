import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export function PlacementTableMasterRow({
  row,
  warehouses,
  isExpanded,
  onToggleExpand,
  onOpenItems,
}) {
  const sold15 = row.sold15 || 0;
  const sold30 = row.sold30 || 0;
  const avgPerDay = Number(row.avgSellOutPerDay || 0);
  const invLife = row.inventoryLifeDays === null ? 'N/A' : Number(row.inventoryLifeDays).toFixed(1);
  const suggestedPO = row.suggestedPoQty || 0;

  return (
    <tr
      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      onClick={onToggleExpand}
    >
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {row.display_name}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-center bg-blue-50 dark:bg-blue-900/20">
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {row.total}
        </span>
      </td>
      {warehouses.map((warehouse) => {
        const stock = row.warehouses[warehouse.id] || 0;
        const valuation = row.warehouseValuations?.[warehouse.id] || 0;
        const isLowStock = stock > 0 && stock < 5;
        const hasStock = stock > 0;

        return (
          <td
            key={warehouse.id}
            className={`px-3 py-2 text-center cursor-pointer transition-colors ${
              hasStock
                ? isLowStock
                  ? 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200'
                  : 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200'
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              if (hasStock) {
                onOpenItems({
                  warehouseId: warehouse.id,
                  productMasterId: row.product_master_id,
                });
              }
            }}
          >
            <div className="flex flex-col items-center">
              <span
                className={`font-semibold ${
                  hasStock
                    ? isLowStock
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-green-700 dark:text-green-400'
                    : 'text-gray-400'
                }`}
              >
                {stock}
              </span>
              {hasStock ? (
                <span className="text-[9px] text-gray-500 dark:text-gray-400">
                  &#8369;{Number(valuation).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                </span>
              ) : null}
            </div>
          </td>
        );
      })}
      <td className="px-3 py-2 text-right bg-amber-50 dark:bg-amber-900/20">
        <span className="font-bold text-amber-700 dark:text-amber-400">
          &#8369;{Number(row.totalValuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-3 py-2 text-center bg-orange-50 dark:bg-orange-900/20">
        <span className="font-semibold text-orange-700 dark:text-orange-400">
          {sold15}
        </span>
      </td>
      <td className="px-3 py-2 text-center bg-orange-50 dark:bg-orange-900/20">
        <span className="font-semibold text-orange-700 dark:text-orange-400">
          {sold30}
        </span>
      </td>
      <td className="px-3 py-2 text-center bg-teal-50 dark:bg-teal-900/20">
        <span className="font-semibold text-teal-700 dark:text-teal-400">
          {avgPerDay.toFixed(2)}
        </span>
      </td>
      <td className="px-3 py-2 text-center bg-indigo-50 dark:bg-indigo-900/20">
        <span
          className={`font-semibold ${
            invLife !== 'N/A' && parseFloat(invLife) < 15
              ? 'text-red-600 dark:text-red-400'
              : 'text-indigo-700 dark:text-indigo-400'
          }`}
        >
          {invLife}
          {invLife !== 'N/A' ? 'd' : ''}
        </span>
      </td>
      <td className="px-3 py-2 text-center bg-rose-50 dark:bg-rose-900/20">
        <span
          className={`font-semibold ${
            suggestedPO > 0
              ? 'text-rose-700 dark:text-rose-400'
              : 'text-gray-400'
          }`}
        >
          {suggestedPO}
        </span>
      </td>
    </tr>
  );
}

export function PlacementTableVariantRow({
  variant,
  warehouses,
  onOpenItems,
}) {
  return (
    <tr className="border-b bg-gray-50/50 dark:bg-gray-800/50">
      <td className="px-3 py-1.5 pl-10">
        <span className="text-[10px] text-gray-600 dark:text-gray-400">
          {variant.variant_name}
          {variant.condition ? (
            <span className="ml-2 text-gray-400">({variant.condition})</span>
          ) : null}
        </span>
      </td>
      <td className="px-3 py-1.5 text-center bg-blue-50/50 dark:bg-blue-900/10">
        <span className="text-[10px] font-semibold text-blue-500">
          {variant.totalQty}
        </span>
      </td>
      {warehouses.map((warehouse) => {
        const data = variant.warehouseData[warehouse.id];
        const qty = data?.qty || 0;
        const valuation = data?.valuation || 0;
        const hasStock = qty > 0;

        return (
          <td
            key={warehouse.id}
            className={`px-3 py-1.5 text-center cursor-pointer transition-colors ${
              hasStock ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''
            }`}
            onClick={() => {
              if (hasStock) {
                onOpenItems({
                  warehouseId: warehouse.id,
                  variantId: variant.variant_id,
                });
              }
            }}
          >
            <div className="flex flex-col items-center">
              <span
                className={`text-[10px] font-medium ${
                  hasStock
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                {qty}
              </span>
              {hasStock ? (
                <span className="text-[8px] text-gray-400 dark:text-gray-500">
                  &#8369;{Number(valuation).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                </span>
              ) : null}
            </div>
          </td>
        );
      })}
      <td className="px-3 py-1.5 text-right bg-amber-50/50 dark:bg-amber-900/10">
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
          &#8369;{Number(variant.totalValuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-3 py-1.5 text-center bg-orange-50/50 dark:bg-orange-900/10"><span className="text-[10px] text-gray-400">-</span></td>
      <td className="px-3 py-1.5 text-center bg-orange-50/50 dark:bg-orange-900/10"><span className="text-[10px] text-gray-400">-</span></td>
      <td className="px-3 py-1.5 text-center bg-teal-50/50 dark:bg-teal-900/10"><span className="text-[10px] text-gray-400">-</span></td>
      <td className="px-3 py-1.5 text-center bg-indigo-50/50 dark:bg-indigo-900/10"><span className="text-[10px] text-gray-400">-</span></td>
      <td className="px-3 py-1.5 text-center bg-rose-50/50 dark:bg-rose-900/10"><span className="text-[10px] text-gray-400">-</span></td>
    </tr>
  );
}

export default function PlacementTableRow({ virtualRow, ...props }) {
  if (virtualRow?.type === 'variant') {
    return <PlacementTableVariantRow variant={virtualRow.variant} {...props} />;
  }

  return <PlacementTableMasterRow row={virtualRow?.row || props.row} {...props} />;
}
