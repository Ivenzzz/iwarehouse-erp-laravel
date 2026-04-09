<?php

namespace App\Features\StockTransfers\Actions;

use App\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ConsolidateStockTransfers
{
    public function __construct(
        private readonly UpsertStockTransferMilestone $upsertStockTransferMilestone,
    ) {
    }

    /**
     * @param  array<int, int>  $transferIds
     * @return array{masterTransfer: StockTransfer, sourceTransferIds: array<int, int>, sourceTransferNumbers: array<int, string>}
     */
    public function handle(array $transferIds, ?int $actorId = null): array
    {
        if (count($transferIds) < 2) {
            throw new InvalidArgumentException('Select at least two transfers to consolidate.');
        }

        return DB::transaction(function () use ($transferIds, $actorId) {
            $transfers = StockTransfer::query()
                ->with(['items', 'consolidation', 'sourceConsolidationLink'])
                ->whereIn('id', $transferIds)
                ->lockForUpdate()
                ->get();

            if ($transfers->count() !== count($transferIds)) {
                throw new InvalidArgumentException('One or more selected transfers no longer exist.');
            }

            $first = $transfers->first();
            $sourceWarehouseId = $first->source_warehouse_id;
            $destinationWarehouseId = $first->destination_warehouse_id;

            foreach ($transfers as $transfer) {
                if (! in_array($transfer->status, ['draft', 'picked'], true)) {
                    throw new InvalidArgumentException("{$transfer->transfer_number} cannot be consolidated from status {$transfer->status}.");
                }

                if ($transfer->consolidation !== null || $transfer->sourceConsolidationLink !== null || $transfer->status === 'consolidated') {
                    throw new InvalidArgumentException("{$transfer->transfer_number} has already been consolidated.");
                }

                if ($transfer->source_warehouse_id !== $sourceWarehouseId || $transfer->destination_warehouse_id !== $destinationWarehouseId) {
                    throw new InvalidArgumentException('Selected transfers must share the same route.');
                }
            }

            $master = StockTransfer::query()->create([
                'transfer_number' => 'PENDING',
                'source_warehouse_id' => $sourceWarehouseId,
                'destination_warehouse_id' => $destinationWarehouseId,
                'created_by_id' => $actorId,
                'status' => 'draft',
                'operation_type' => 'internal_transfer',
                'priority' => 'normal',
                'reference' => 'Consolidated transfer',
                'notes' => 'Merged from transfers: '.$transfers->pluck('transfer_number')->implode(', '),
            ]);

            $master->update([
                'transfer_number' => sprintf('TRN-%08d', $master->id),
            ]);

            $consolidation = $master->consolidation()->create([
                'consolidated_by_id' => $actorId,
                'consolidated_at' => now(),
            ]);

            $this->upsertStockTransferMilestone->handle($master, 'created', $actorId, null, [], optional($master->created_at)?->toDateTimeString());
            $this->upsertStockTransferMilestone->handle($master, 'consolidated', $actorId);

            foreach ($transfers as $sourceTransfer) {
                foreach ($sourceTransfer->items as $sourceItem) {
                    $sourceItem->update([
                        'stock_transfer_id' => $master->id,
                    ]);
                }

                $consolidation->sources()->create([
                    'source_stock_transfer_id' => $sourceTransfer->id,
                ]);

                $sourceTransfer->update([
                    'status' => 'consolidated',
                    'notes' => trim(($sourceTransfer->notes ? $sourceTransfer->notes."\n" : '')."Consolidated into {$master->transfer_number}."),
                ]);

                $this->upsertStockTransferMilestone->handle($sourceTransfer, 'consolidated', $actorId);
            }

            return [
                'masterTransfer' => $master->fresh(),
                'sourceTransferIds' => $transfers->pluck('id')->values()->all(),
                'sourceTransferNumbers' => $transfers->pluck('transfer_number')->values()->all(),
            ];
        });
    }
}
