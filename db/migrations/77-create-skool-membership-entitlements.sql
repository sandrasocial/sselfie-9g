BEGIN;

-- Skool is an independent paid-membership authority. These rows are not Stripe
-- subscriptions, so existing billing and historical Stripe access stay untouched.
CREATE TABLE IF NOT EXISTS skool_membership_entitlements (
  membership_key TEXT PRIMARY KEY CHECK (
    membership_key ~ '^skool:sselfie-photo-club-2569:[a-f0-9]{32}$'
  ),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL CHECK (group_id = 'sselfie-photo-club-2569'),
  plan_code TEXT NOT NULL CHECK (plan_code = 'sselfie-skool-monthly'),
  access_status TEXT NOT NULL DEFAULT 'active'
    CHECK (access_status IN ('active', 'revoked')),
  reconciliation_status TEXT NOT NULL DEFAULT 'present'
    CHECK (reconciliation_status IN (
      'present', 'missing_unconfirmed', 'churn_review_required'
    )),
  consecutive_roster_misses INTEGER NOT NULL DEFAULT 0
    CHECK (consecutive_roster_misses >= 0),
  source_event_id TEXT NOT NULL CHECK (
    char_length(source_event_id) BETWEEN 1 AND 256
    AND source_event_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  first_observed_at TIMESTAMPTZ NOT NULL,
  last_observed_at TIMESTAMPTZ NOT NULL,
  last_confirmed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skool_membership_entitlements_user_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS skool_membership_entitlements_access_idx
  ON skool_membership_entitlements (user_id, access_status);

CREATE INDEX IF NOT EXISTS skool_membership_entitlements_reconciliation_idx
  ON skool_membership_entitlements (reconciliation_status, last_observed_at);

-- One durable claim per confirmed paid billing date. The sender never chooses
-- this key; the application derives it from the signed payment observation.
CREATE TABLE IF NOT EXISTS skool_membership_events (
  dedupe_key TEXT PRIMARY KEY CHECK (
    dedupe_key ~ '^skool:sselfie-photo-club-2569:[a-f0-9]{32}:period:[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  ),
  membership_key TEXT NOT NULL REFERENCES skool_membership_entitlements(membership_key)
    ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type = 'membership.present'),
  observed_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_skool_membership_grant_key
  ON credit_transactions (user_id, reference_id)
  WHERE transaction_type = 'subscription_grant'
    AND reference_id LIKE 'skool-membership-period:%';

ALTER TABLE skool_membership_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE skool_membership_events ENABLE ROW LEVEL SECURITY;

-- The customer application reaches Neon only through its server-side database
-- role. Avoid provider-specific role names so this migration is portable and
-- leave no implicit access for other database roles.
REVOKE ALL ON TABLE skool_membership_entitlements FROM PUBLIC;
REVOKE ALL ON TABLE skool_membership_events FROM PUBLIC;

COMMIT;
