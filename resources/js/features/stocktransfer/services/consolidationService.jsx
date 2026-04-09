import axios from "axios";
import {
  getDestinationLocationId,
  getSourceLocationId,
} from "./transferService";

const CONSOLIDATABLE_STATUSES = new Set(["draft", "picked"]);

const isCompletedStatus = (status) =>
  ["shipped", "partially_received", "fully_received", "consolidated"].includes(
    status
  );

const hasConsolidationMetadata = (transfer) => {
  const consolidation = transfer?.consolidation_json || {};

  return Boolean(
    consolidation.role ||
      consolidation.merged_into_transfer_id ||
      (consolidation.source_transfer_ids || []).length > 0
  );
};

const resolveCurrentUserDisplayName = (currentUser) =>
  currentUser?.full_name ||
  [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ").trim() ||
  currentUser?.name ||
  currentUser?.email ||
  currentUser?.id ||
  "unknown";

export const getConsolidationSummary = (transfers = []) => ({
  transferCount: transfers.length,
  transferNumbers: transfers.map((transfer) => transfer.transfer_number).filter(Boolean),
  sourceLocationId: transfers[0] ? getSourceLocationId(transfers[0]) : "",
  destinationLocationId: transfers[0] ? getDestinationLocationId(transfers[0]) : "",
  totalItems: transfers.reduce((total, transfer) => total + (transfer.product_lines || []).length, 0),
});

export const validateTransferConsolidation = (transfers = []) => {
  if (transfers.length < 2) {
    return {
      isEligible: false,
      reason: "Select at least 2 transfers to consolidate.",
    };
  }

  const [firstTransfer, ...restTransfers] = transfers;
  const sourceLocationId = getSourceLocationId(firstTransfer);
  const destinationLocationId = getDestinationLocationId(firstTransfer);

  for (const transfer of transfers) {
    if (hasConsolidationMetadata(transfer) || transfer.status === "consolidated") {
      return {
        isEligible: false,
        reason: `${transfer.transfer_number} has already been consolidated.`,
      };
    }

    if (isCompletedStatus(transfer.status) || !CONSOLIDATABLE_STATUSES.has(transfer.status)) {
      return {
        isEligible: false,
        reason: `${transfer.transfer_number} is in status "${transfer.status}" and cannot be consolidated.`,
      };
    }
  }

  const mixedOrigin = restTransfers.some(
    (transfer) => getSourceLocationId(transfer) !== sourceLocationId
  );
  if (mixedOrigin) {
    return {
      isEligible: false,
      reason: "Selected transfers must share the same origin warehouse.",
    };
  }

  const mixedDestination = restTransfers.some(
    (transfer) => getDestinationLocationId(transfer) !== destinationLocationId
  );
  if (mixedDestination) {
    return {
      isEligible: false,
      reason: "Selected transfers must share the same destination warehouse.",
    };
  }

  return {
    isEligible: true,
    reason: "",
    summary: getConsolidationSummary(transfers),
  };
};

export async function consolidateTransfers({
  transfers,
  currentUser,
}) {
  const validation = validateTransferConsolidation(transfers);
  if (!validation.isEligible) {
    throw new Error(validation.reason);
  }

  const response = await axios.post(route("stock-transfers.consolidate"), {
    transferIds: transfers.map((transfer) => transfer.id),
    actorName: resolveCurrentUserDisplayName(currentUser),
  });

  return response.data;
}
