-- One Stripe invoice = one succeeded/paid revenue row, regardless of which id type
-- (in_/pi_/ch_/py_) the writer keyed it on. The same charge was recorded twice under
-- different ids 84 times between Nov 2025 and Jun 2026 (webhook + backfill era drift),
-- overstating stripe_payments revenue vs live Stripe. Duplicates were marked
-- status='duplicate' with a metadata.dedup_audit trail on 2026-07-06; this index makes
-- the invariant structural. Writers must key invoice-based rows on invoice.id
-- (see lib/payments/lifecycle/invoice-paid.ts).
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_payments_invoice_unique
  ON stripe_payments (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL AND status IN ('succeeded', 'paid');
