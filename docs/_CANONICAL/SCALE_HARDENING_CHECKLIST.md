# Scalability & Reliability Hardening Checklist

**Created:** 2026-02-25  
**Purpose:** Record Wave 4 hardening and provide a checklist for recurring incidents and growth readiness.

## Completed (2026-02-25)

| Area | Change | Rollback |
|------|--------|----------|
| **Error envelope** | `lib/error-envelope.ts`: `toErrorEnvelope(error, code?, context?)` for consistent code/message/context in logs | Remove envelope usage; revert callers to ad-hoc context |
| **Cron logging** | `lib/cron-logger.ts`: uses error envelope; `admin_cron_runs.summary` and `admin_email_errors.context` include `errorCode` | Revert cron-logger and admin-error-log imports |
| **Admin error log** | `lib/admin-error-log.ts`: optional `code` in options; context stored with envelope code | Revert to previous options shape |
| **Email idempotency** | `lib/email/run-scheduled-campaigns.ts`: `failStuckSendingCampaigns(STUCK_SENDING_HOURS)` marks campaigns stuck in `sending` > N hours as `failed` (reason: `stuck_sending_timeout`). Env: `EMAIL_STUCK_SENDING_HOURS` (default 2). | Set `EMAIL_STUCK_SENDING_HOURS=0` or revert function and call site |

## Checklist for future hardening

- [ ] **Retry limits:** Add explicit max retries for individual email send failures in a campaign run (e.g. stop after N consecutive failures per campaign).
- [ ] **Polling/reconciliation convergence:** Audit cron routes under `app/api/cron/` for duplicated polling/reconciliation logic; extract shared backoff or batch size constants.
- [ ] **Structured log metadata:** Ensure all cron routes pass a minimal context object to `CronLogger.success()` / `CronLogger.error()` (e.g. `{ itemCount, duration }`).
- [ ] **Email campaign metrics:** After marking stuck campaigns failed, consider writing to `admin_email_errors` or a dedicated audit log for visibility.

## Evidence

- Error envelope: `lib/error-envelope.ts`
- Cron: `lib/cron-logger.ts`, `app/api/cron/*/route.ts`
- Admin errors: `lib/admin-error-log.ts`
- Email: `lib/email/run-scheduled-campaigns.ts` (stale draft reset + stuck sending fail)

## References

- Plan: Safe Aggressive Optimization (Wave 4)
- Backlog: O-07 (error envelope), O-08 (idempotency/retry limits)
