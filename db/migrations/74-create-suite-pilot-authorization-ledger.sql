BEGIN;

CREATE TABLE suite_pilot_preflight_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key TEXT NOT NULL UNIQUE CHECK (
    char_length(snapshot_key) BETWEEN 1 AND 256 AND snapshot_key ~ '^[A-Za-z0-9_.:-]+$'
  ),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('skool', 'studio_platform_partner')),
  resource_id TEXT NOT NULL CHECK (
    char_length(resource_id) BETWEEN 1 AND 256 AND resource_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  report_digest TEXT NOT NULL CHECK (report_digest ~ '^sha256:[a-f0-9]{64}$'),
  pilot_mode TEXT NOT NULL DEFAULT 'founder_only' CHECK (pilot_mode = 'founder_only'),
  source_state TEXT NOT NULL DEFAULT 'ready_for_sandra_approval'
    CHECK (source_state = 'ready_for_sandra_approval'),
  approval_state TEXT NOT NULL DEFAULT 'not_requested' CHECK (approval_state = 'not_requested'),
  approval_summary_digest TEXT NOT NULL CHECK (approval_summary_digest ~ '^sha256:[a-f0-9]{64}$'),
  baseline_digest TEXT NOT NULL CHECK (baseline_digest ~ '^sha256:[a-f0-9]{64}$'),
  academy_access_digest TEXT NOT NULL CHECK (academy_access_digest ~ '^sha256:[a-f0-9]{64}$'),
  provider_identity_digest TEXT NOT NULL CHECK (provider_identity_digest ~ '^sha256:[a-f0-9]{64}$'),
  provider_terms_digest TEXT NOT NULL CHECK (provider_terms_digest ~ '^sha256:[a-f0-9]{64}$'),
  provider_privacy_digest TEXT NOT NULL CHECK (provider_privacy_digest ~ '^sha256:[a-f0-9]{64}$'),
  provider_removal_digest TEXT NOT NULL CHECK (provider_removal_digest ~ '^sha256:[a-f0-9]{64}$'),
  consent_evidence_digest TEXT NOT NULL CHECK (consent_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  capability_evidence_digest TEXT NOT NULL CHECK (capability_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  rollback_owner TEXT NOT NULL DEFAULT 'sandra' CHECK (rollback_owner = 'sandra'),
  rollback_method TEXT NOT NULL DEFAULT 'manual_provider_removal'
    CHECK (rollback_method = 'manual_provider_removal'),
  rollback_sla_hours INTEGER NOT NULL CHECK (rollback_sla_hours BETWEEN 1 AND 168),
  data_categories JSONB NOT NULL CHECK (data_categories = '["email_address"]'::jsonb),
  password_state TEXT NOT NULL CHECK (password_state IN ('password_ready', 'recovery_required')),
  observed_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  consent_captured_at TIMESTAMPTZ NOT NULL,
  consent_check_at TIMESTAMPTZ NOT NULL,
  consent_expires_at TIMESTAMPTZ NOT NULL,
  capability_verified_at TIMESTAMPTZ NOT NULL,
  capability_expires_at TIMESTAMPTZ NOT NULL,
  approval_deadline TIMESTAMPTZ NOT NULL CHECK (
    approval_deadline = LEAST(
      consent_check_at + INTERVAL '5 minutes', consent_captured_at + INTERVAL '24 hours',
      consent_expires_at, capability_verified_at + INTERVAL '24 hours',
      capability_expires_at, completed_at + INTERVAL '5 minutes'
    ) AND approval_deadline > completed_at
  ),
  external_effects_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (external_effects_allowed = FALSE),
  adapter_enablement_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (adapter_enablement_allowed = FALSE),
  dispatch_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (dispatch_allowed = FALSE),
  proposal JSONB CHECK (proposal IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_digest),
  UNIQUE (id, user_id, provider, resource_id),
  UNIQUE (id, user_id, provider, resource_id, approval_deadline)
);

CREATE TABLE suite_pilot_authorization_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE CHECK (
    char_length(event_key) BETWEEN 1 AND 256 AND event_key ~ '^[A-Za-z0-9_.:-]+$'
  ),
  snapshot_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  revision BIGINT NOT NULL CHECK (revision >= 1),
  decision TEXT NOT NULL CHECK (decision IN (
    'consent_confirmed', 'founder_approved', 'consent_withdrawn', 'founder_revoked'
  )),
  decision_evidence_digest TEXT NOT NULL CHECK (decision_evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  decision_binding_digest TEXT NOT NULL CHECK (decision_binding_digest ~ '^sha256:[a-f0-9]{64}$'),
  actor_user_id TEXT NOT NULL,
  reason_code TEXT CHECK (reason_code IN (
    'consent_withdrawn', 'founder_cancelled', 'provider_contract_changed',
    'preflight_invalidated', 'operator_kill_switch'
  )),
  prior_event_id UUID REFERENCES suite_pilot_authorization_events(id) ON DELETE RESTRICT,
  prior_snapshot_id UUID,
  target_event_id UUID REFERENCES suite_pilot_authorization_events(id) ON DELETE RESTRICT,
  target_snapshot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT suite_pilot_events_snapshot_binding_fk FOREIGN KEY (
    snapshot_id, user_id, provider, resource_id
  ) REFERENCES suite_pilot_preflight_snapshots (id, user_id, provider, resource_id) ON DELETE RESTRICT,
  UNIQUE (snapshot_id, revision),
  UNIQUE (snapshot_id, decision),
  UNIQUE (snapshot_id, decision_evidence_digest),
  UNIQUE (id, snapshot_id, decision, revision),
  UNIQUE (id, snapshot_id),
  CONSTRAINT suite_pilot_events_prior_binding_fk FOREIGN KEY (prior_event_id, prior_snapshot_id)
    REFERENCES suite_pilot_authorization_events (id, snapshot_id) ON DELETE RESTRICT,
  CONSTRAINT suite_pilot_events_target_binding_fk FOREIGN KEY (target_event_id, target_snapshot_id)
    REFERENCES suite_pilot_authorization_events (id, snapshot_id) ON DELETE RESTRICT,
  CHECK (actor_user_id = user_id),
  CHECK (prior_snapshot_id IS NULL OR prior_snapshot_id = snapshot_id),
  CHECK (target_snapshot_id IS NULL OR target_snapshot_id = snapshot_id),
  CHECK (
    (decision = 'consent_confirmed' AND revision = 1 AND prior_event_id IS NULL
      AND target_event_id IS NULL AND reason_code IS NULL) OR
    (decision = 'founder_approved' AND revision = 2 AND prior_event_id IS NOT NULL
      AND target_event_id IS NULL AND reason_code IS NULL) OR
    (decision = 'consent_withdrawn' AND revision IN (2, 3, 4)
      AND prior_event_id IS NOT NULL AND target_event_id IS NOT NULL
      AND reason_code = 'consent_withdrawn') OR
    (decision = 'founder_revoked' AND revision = 3
      AND prior_event_id IS NOT NULL AND target_event_id IS NOT NULL
      AND reason_code IN (
        'founder_cancelled', 'provider_contract_changed', 'preflight_invalidated',
        'operator_kill_switch'
      ))
  )
);

CREATE FUNCTION reject_suite_pilot_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'suite pilot authorization ledger is append-only'; END $$;
CREATE TRIGGER suite_pilot_snapshots_immutable BEFORE UPDATE OR DELETE ON suite_pilot_preflight_snapshots
  FOR EACH ROW EXECUTE FUNCTION reject_suite_pilot_ledger_mutation();
CREATE TRIGGER suite_pilot_events_immutable BEFORE UPDATE OR DELETE ON suite_pilot_authorization_events
  FOR EACH ROW EXECUTE FUNCTION reject_suite_pilot_ledger_mutation();
CREATE TRIGGER suite_pilot_snapshots_no_truncate BEFORE TRUNCATE ON suite_pilot_preflight_snapshots
  FOR EACH STATEMENT EXECUTE FUNCTION reject_suite_pilot_ledger_mutation();
CREATE TRIGGER suite_pilot_events_no_truncate BEFORE TRUNCATE ON suite_pilot_authorization_events
  FOR EACH STATEMENT EXECUTE FUNCTION reject_suite_pilot_ledger_mutation();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM integration_outbox WHERE provider IN ('skool', 'studio_platform_partner'))
  THEN RAISE EXCEPTION 'Migration 74 requires zero protected-provider outbox rows'; END IF;
END $$;
ALTER TABLE integration_outbox ADD CONSTRAINT integration_outbox_protected_provider_kill_switch
  CHECK (provider NOT IN ('skool', 'studio_platform_partner')) NOT VALID;
ALTER TABLE integration_outbox VALIDATE CONSTRAINT integration_outbox_protected_provider_kill_switch;

CREATE INDEX suite_pilot_snapshots_lookup_idx
  ON suite_pilot_preflight_snapshots (provider, user_id, created_at DESC);
CREATE INDEX suite_pilot_events_current_idx
  ON suite_pilot_authorization_events (snapshot_id, revision DESC);

COMMIT;
