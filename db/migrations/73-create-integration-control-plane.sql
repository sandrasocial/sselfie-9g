BEGIN;

CREATE TABLE IF NOT EXISTS business_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'lead_captured',
    'checkout_started',
    'product_purchased',
    'membership_started',
    'membership_ended',
    'result_completed'
  )),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  aggregate_type TEXT NOT NULL CHECK (aggregate_type ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  aggregate_id TEXT NOT NULL CHECK (char_length(aggregate_id) BETWEEN 1 AND 256),
  subject_type TEXT NOT NULL CHECK (subject_type ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  subject_id TEXT NOT NULL CHECK (char_length(subject_id) BETWEEN 1 AND 256),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source_provider TEXT CHECK (source_provider IN (
    'sselfie', 'stripe', 'resend', 'manychat', 'skool', 'studio_platform_partner'
  )),
  source_event_id TEXT CHECK (
    char_length(source_event_id) BETWEEN 1 AND 256
    AND source_event_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 256
    AND idempotency_key ~ '^[A-Za-z0-9_.:-]+$'
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((source_provider IS NULL) = (source_event_id IS NULL))
);

CREATE INDEX IF NOT EXISTS business_events_aggregate_idx
  ON business_events (aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS business_events_user_idx
  ON business_events (user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_events_source_idx
  ON business_events (source_provider, source_event_id, event_type)
  WHERE source_provider IS NOT NULL AND source_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'sselfie', 'stripe', 'resend', 'manychat', 'skool', 'studio_platform_partner'
  )),
  scope_key TEXT NOT NULL CHECK (scope_key IN ('account', 'audience', 'community', 'creator_program', 'membership')),
  external_account_id TEXT NOT NULL CHECK (
    char_length(external_account_id) BETWEEN 1 AND 256
    AND external_account_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled', 'failed', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT external_accounts_provider_scope_external_key
    UNIQUE (provider, scope_key, external_account_id),
  CONSTRAINT external_accounts_user_provider_scope_key
    UNIQUE (user_id, provider, scope_key)
);

CREATE INDEX IF NOT EXISTS external_accounts_user_status_idx
  ON external_accounts (user_id, status);

CREATE TABLE IF NOT EXISTS external_provisioning_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'sselfie', 'stripe', 'resend', 'manychat', 'skool', 'studio_platform_partner'
  )),
  scope_key TEXT NOT NULL CHECK (scope_key IN ('account', 'audience', 'community', 'creator_program', 'membership')),
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'external_account', 'audience_membership', 'community_membership',
    'creator_enrollment', 'membership_access'
  )),
  resource_id TEXT NOT NULL CHECK (char_length(resource_id) BETWEEN 1 AND 256),
  desired_state TEXT NOT NULL CHECK (desired_state IN ('present', 'absent')),
  observed_state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (observed_state IN ('unknown', 'pending', 'present', 'absent', 'failed', 'blocked')),
  desired_revision BIGINT NOT NULL DEFAULT 1 CHECK (desired_revision >= 1),
  source_business_event_id UUID REFERENCES business_events(id) ON DELETE SET NULL,
  source_provider TEXT CHECK (source_provider IN (
    'sselfie', 'stripe', 'resend', 'manychat', 'skool', 'studio_platform_partner'
  )),
  source_event_id TEXT CHECK (
    char_length(source_event_id) BETWEEN 1 AND 256
    AND source_event_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  last_error_code TEXT CHECK (last_error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  last_error_message TEXT CHECK (
    last_error_message IS NULL OR last_error_message = 'Integration provider operation failed'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observed_at TIMESTAMPTZ,
  CHECK ((source_provider IS NULL) = (source_event_id IS NULL)),
  CONSTRAINT external_provisioning_states_resource_key
    UNIQUE (user_id, provider, scope_key, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS external_provisioning_states_pending_idx
  ON external_provisioning_states (provider, scope_key, desired_state, observed_state, updated_at)
  WHERE desired_state IS DISTINCT FROM observed_state;
CREATE INDEX IF NOT EXISTS external_provisioning_states_source_idx
  ON external_provisioning_states (source_business_event_id)
  WHERE source_business_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS integration_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_event_id UUID REFERENCES business_events(id) ON DELETE RESTRICT,
  provisioning_state_id UUID REFERENCES external_provisioning_states(id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  provider TEXT NOT NULL CHECK (provider IN (
    'sselfie', 'stripe', 'resend', 'manychat', 'skool', 'studio_platform_partner'
  )),
  scope_key TEXT NOT NULL CHECK (scope_key IN ('account', 'audience', 'community', 'creator_program', 'membership')),
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'external_account', 'audience_membership', 'community_membership',
    'creator_enrollment', 'membership_access'
  )),
  resource_id TEXT NOT NULL CHECK (
    char_length(resource_id) BETWEEN 1 AND 256
    AND resource_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  captured_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  operation TEXT NOT NULL CHECK (operation IN ('provision', 'deprovision', 'synchronize')),
  business_key TEXT NOT NULL CHECK (
    char_length(business_key) BETWEEN 1 AND 256
    AND business_key ~ '^[A-Za-z0-9_.:-]+$'
    AND business_key !~* '(email|phone|recipient|token|secret|authorization|password|apikey|url)'
  ),
  destination_key TEXT NOT NULL CHECK (
    char_length(destination_key) BETWEEN 1 AND 256
    AND destination_key ~ '^[A-Za-z0-9_.:-]+$'
    AND destination_key !~* '(email|phone|recipient|token|secret|authorization|password|apikey|url)'
  ),
  idempotency_key TEXT NOT NULL CHECK (
    char_length(idempotency_key) BETWEEN 1 AND 256
    AND idempotency_key ~ '^[A-Za-z0-9_.:-]+$'
    AND idempotency_key !~* '(email|phone|recipient|token|secret|authorization|password|apikey|url)'
  ),
  captured_desired_revision BIGINT CHECK (captured_desired_revision >= 1),
  captured_desired_state TEXT CHECK (captured_desired_state IN ('present', 'absent')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'retry', 'succeeded', 'dead_letter', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_expires_at TIMESTAMPTZ,
  claim_token UUID,
  provider_reference TEXT CHECK (
    char_length(provider_reference) BETWEEN 1 AND 256
    AND provider_reference ~ '^[A-Za-z0-9_.:-]+$'
  ),
  last_error_code TEXT CHECK (last_error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  last_error_message TEXT CHECK (
    last_error_message IS NULL OR last_error_message = 'Integration provider operation failed'
  ),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (business_event_id IS NOT NULL OR provisioning_state_id IS NOT NULL),
  CHECK (
    (provisioning_state_id IS NULL) = (captured_desired_revision IS NULL)
    AND (provisioning_state_id IS NULL) = (captured_desired_state IS NULL)
  ),
  CONSTRAINT integration_outbox_event_destination_family_key
    UNIQUE (business_event_id, provider, scope_key, resource_type),
  CONSTRAINT integration_outbox_event_destination_operation_key
    UNIQUE (business_event_id, destination_key, operation),
  CONSTRAINT integration_outbox_provider_idempotency_key
    UNIQUE (provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS integration_outbox_claim_idx
  ON integration_outbox (available_at, created_at, id)
  WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS integration_outbox_expired_lease_idx
  ON integration_outbox (lease_expires_at, id)
  WHERE status = 'claimed';
CREATE INDEX IF NOT EXISTS integration_outbox_resource_revision_idx
  ON integration_outbox (provisioning_state_id, captured_desired_revision)
  WHERE provisioning_state_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS integration_outbox_one_claim_per_resource_idx
  ON integration_outbox (provisioning_state_id)
  WHERE status = 'claimed' AND provisioning_state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS integration_outbox_event_idx
  ON integration_outbox (business_event_id) WHERE business_event_id IS NOT NULL;

CREATE OR REPLACE VIEW integration_operator_queue_v AS
SELECT
  o.id,
  COALESCE(s.user_id, e.user_id) AS user_id,
  o.status,
  o.provider,
  o.scope_key,
  o.operation,
  o.business_key,
  o.destination_key,
  o.attempts,
  o.max_attempts,
  o.available_at,
  o.lease_expires_at,
  o.captured_desired_revision,
  s.desired_revision,
  s.desired_state,
  s.observed_state,
  o.last_error_code,
  o.last_error_message,
  o.created_at,
  o.updated_at
FROM integration_outbox o
LEFT JOIN external_provisioning_states s ON s.id = o.provisioning_state_id
LEFT JOIN business_events e ON e.id = o.business_event_id
WHERE o.status IN ('pending', 'claimed', 'retry');

CREATE OR REPLACE VIEW integration_dead_letters_v AS
SELECT
  o.id,
  COALESCE(s.user_id, e.user_id) AS user_id,
  o.provider,
  o.scope_key,
  o.operation,
  o.business_key,
  o.destination_key,
  o.attempts,
  o.max_attempts,
  o.captured_desired_revision,
  s.desired_revision,
  s.desired_state,
  s.observed_state,
  o.last_error_code,
  o.last_error_message,
  o.created_at,
  o.updated_at
FROM integration_outbox o
LEFT JOIN external_provisioning_states s ON s.id = o.provisioning_state_id
LEFT JOIN business_events e ON e.id = o.business_event_id
WHERE o.status = 'dead_letter';

COMMIT;
