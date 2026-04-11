import { base44 } from "@/api/base44Client";

export const createStockRequest = async (data, currentUser, warehouses) => {
  const requestNumber = `SR-${Date.now().toString().slice(-6)}`;
  const timestamp = new Date().toISOString();
  const initialStatus = "pending";
  const userProfiles = await base44.entities.UserProfiles.list();
  const currentUserProfile = userProfiles.find(
    (profile) =>
      profile.user_id === currentUser?.id ||
      profile.google_id === currentUser?.id ||
      profile.google_id === currentUser?.google_id
  );

  if (!currentUserProfile?.user_id) {
    throw new Error("No UserProfiles record found for the currently logged-in user.");
  }

  const branch = warehouses.find((w) => w.id === data.branch_id);
  const branchName = branch?.name || "Unknown Branch";
  const requestedByName = currentUser?.full_name || currentUser?.email || '';

  const sanitizedItems = (data.items || []).map((item) => ({
    variant_id: item.variant_id,
    brand: item.brand || '',
    model: item.model || '',
    variant_sku: item.variant_sku || '',
    variant_name: item.variant_name || '',
    condition: item.condition || 'Brand New',
    variant_attributes: item.variant_attributes || {},
    quantity: item.quantity,
    reason: item.reason,
  }));

  const stockRequest = await base44.entities.StockRequest.create({
    branch_id: data.branch_id,
    branch_name: branchName,
    requestor_id: currentUserProfile.user_id,
    requested_by: requestedByName,
    required_date: data.required_date,
    purpose: data.purpose,
    items: sanitizedItems,
    notes: data.notes,
    request_number: requestNumber,
    status: initialStatus,
    status_history: [
      {
        status: initialStatus,
        actor_id: currentUserProfile.user_id,
        actor_name: requestedByName,
        timestamp,
        notes: "Stock request submitted"
      }
    ],
    created_at: timestamp,
    updated_at: timestamp,
  });

  await base44.entities.Log.create({
    module: 'stock_request',
    record_id: stockRequest.id,
    action: 'created',
    old_values: null,
    new_values: {
      request_number: requestNumber,
      branch_id: data.branch_id,
      branch_name: branchName,
      requestor_id: currentUserProfile.user_id,
      status: initialStatus,
      items_count: sanitizedItems.length
    },
    user_id: currentUserProfile.user_id,
    description: `${currentUser?.full_name || currentUser?.email} created a new Stock Request at Branch ${branchName} at ${new Date(timestamp).toLocaleString()}. Reference Number: ${requestNumber}`,
    metadata: {
      request_number: requestNumber,
      branch_id: data.branch_id,
      branch_name: branchName,
      requestor_id: currentUserProfile.user_id,
      required_date: data.required_date,
      purpose: data.purpose,
      items: sanitizedItems,
      status: initialStatus,
    },
    created_at: timestamp,
  });

  return stockRequest;
};