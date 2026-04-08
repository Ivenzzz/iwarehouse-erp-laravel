import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'getKPIs') {
      return await handleGetKPIs(base44);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleGetKPIs(base44) {
  // Fetch ALL inventory using service role to bypass pagination limits
  let allInventory = [];
  const PAGE_SIZE = 500;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await base44.asServiceRole.entities.Inventory.filter(
      {},
      '-created_date',
      PAGE_SIZE,
      offset
    );
    allInventory = allInventory.concat(page);
    hasMore = page.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  const totalItems = allInventory.length;

  const availableStock = allInventory.filter(
    (item) => item.status === 'available'
  ).length;

  const totalValuation = allInventory.reduce(
    (sum, item) => sum + (Number(item.cost_price) || 0),
    0
  );

  return Response.json({
    totalItems,
    availableStock,
    totalValuation,
  });
}