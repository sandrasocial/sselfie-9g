# VAULT-DROP-AUTOSYNC-01 — Auto-sync new Shoot Studio publishes into the member Library

**SHIPPED 2026-07-11** — commit `4f13e7fd`, deployed and READY in production. Verified: 17 published
collections pre-dating this fix had no `academy_monthly_drops` row (flagged in Codex's post-deploy
audit, not backfilled by design). Backfilled the same day via `scripts/backfill-vault-library-drops.ts`
(mirrors the shipped upsert logic exactly since `shoot-publisher.ts` is server-only and can't be
imported into a script) — confirmed 0 gaps remain after backfill. Script kept in the repo as a
reusable drift check (`npx tsx scripts/backfill-vault-library-drops.ts` for a dry-run gap list,
`--write` to backfill).

## Why

Found in the 2026-07-11 content-system audit. When Shoot Studio publishes a new collection
(`lib/content-kit/shoot-publisher.ts::publishShootToVault`), it writes straight to `vault_collections`
/ `vault_prompts` — this is the one live, fully-automated path, and it already reaches the freebie
preview page, the paid Vault, and Maya's style tiles.

But the member Library's "Drops" section (`academy_monthly_drops`) is populated by a SEPARATE,
manual script, `scripts/sync-vault-drops.ts`, which reads from yet another hand-maintained static
list (`lib/vault/drop-log.ts`) — not from `vault_collections`. Nothing currently keeps
`drop-log.ts` in sync with what Shoot Studio actually publishes, and nothing runs the script
automatically. `/join/studio` promises "every new drop, every week" in the member Library, so a
new Shoot Studio collection can go live everywhere except the one place that promise points to,
if the manual step is forgotten (which the audit found is the current normal state — the script's
own header calls it "part of the collection SOP," i.e. a manual checklist item, not an automation).

OWNER: codex

## Scope

- In `publishShootToVault` (`lib/content-kit/shoot-publisher.ts`), after the existing
  `vault_collections`/`vault_prompts` writes succeed, also upsert one `academy_monthly_drops` row
  for the collection being published — mirror the upsert shape already proven in
  `scripts/sync-vault-drops.ts` (upsert by `title`, set `description`/`thumbnail_url`/`month`/
  `category`/`status='published'`), but source the values straight from the collection just
  written (its name, `mood_line`, `hero_image_url`, publish date) instead of from
  `lib/vault/drop-log.ts`.
- `lib/vault/drop-log.ts` and `scripts/sync-vault-drops.ts` can stay as-is for now — this task adds
  the automated path for NEW publishes going forward, it does not need to backfill or replace the
  static list. (A full backfill of drops already published via Shoot Studio before this change
  ships, if any are missing from the Library today, is a one-time follow-up — check
  `academy_monthly_drops` against `vault_collections` for gaps and note the count in your PR
  summary; do not auto-backfill without flagging it.)
- Keep this additive and defensive: if the `academy_monthly_drops` upsert fails, log it but do not
  fail the whole publish — the Vault/freebie/Maya writes are the priority and must still succeed.

## Acceptance

- Publishing a new Shoot Studio collection creates or updates a matching `academy_monthly_drops`
  row in the same request, with no manual script run required.
- Existing `sync-vault-drops.ts` / `drop-log.ts` behavior is untouched (no regressions there).
- A publish that succeeds on `vault_collections`/`vault_prompts` but fails on the Library upsert
  still returns success for the main publish, with the Library failure visibly logged.
