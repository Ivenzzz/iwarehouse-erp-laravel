import { format } from "date-fns";

export const calculateQuoteItemTotal = (quantity, unitPrice, discount = 0) => {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const discountAmount = Number(discount) || 0;
  const gross = qty * price;
  return Math.max(0, gross - discountAmount);
};

export const buildAddQuotePayload = (rfqId, quoteForm) => ({
  rfq_id: rfqId,
  supplier_id: Number(quoteForm.supplier_id),
  quote_date: quoteForm.quote_date,
  eta: quoteForm.eta ? format(new Date(quoteForm.eta), "yyyy-MM-dd") : null,
  payment_terms: quoteForm.payment_terms || null,
  tax_amount: Number(quoteForm.tax_amount) || 0,
  shipping_cost: Number(quoteForm.shipping_cost) || 0,
  items: quoteForm.items.map((item) => ({
    rfq_item_id: Number(item.rfq_item_id),
    quoted_quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price) || 0,
    discount: Number(item.discount) || 0,
  })),
});

export const getRankedQuotes = (rfq) => {
  const quotes = rfq?.supplier_quotes?.supplier_quotes || [];
  if (!quotes || quotes.length === 0) return [];

  const ranked = quotes.map((quote) => {
    const leadTimeDays = quote.eta && quote.quote_date
      ? Math.max(0, Math.ceil((new Date(quote.eta) - new Date(quote.quote_date)) / (1000 * 60 * 60 * 24)))
      : 999;
    const score = quote.total_amount * Math.max(1, leadTimeDays);
    return { ...quote, leadTimeDays, score: parseFloat(score.toFixed(2)) };
  });

  return ranked.sort((a, b) => a.score - b.score);
};
