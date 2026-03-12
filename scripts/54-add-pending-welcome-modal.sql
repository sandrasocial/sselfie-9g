-- Migration: add pending_welcome_modal column to users table
-- Applied manually to live Neon DB on 2026-03-11 (during Phase 2 funnel deployment).
-- This file captures that change for reproducibility in fresh environments and CI.
--
-- Purpose: Stripe webhook writes the purchased product_type here after checkout.
--          The app shell reads it on load and shows a PostPurchaseWelcomeModal,
--          then clears it via DELETE /api/user/pending-welcome on dismissal.

ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_welcome_modal TEXT;

COMMENT ON COLUMN users.pending_welcome_modal IS
  'Set by Stripe webhook on successful checkout (non-test, non-credit-topup). '
  'Stores the product_type (e.g. sselfie_studio_membership, paid_blueprint). '
  'Read by /api/user/pending-welcome GET, cleared by DELETE on modal dismissal.';
