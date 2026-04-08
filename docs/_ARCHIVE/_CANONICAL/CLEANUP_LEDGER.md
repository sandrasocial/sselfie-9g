# Dead-Code and Artifact Cleanup Ledger

**Created:** 2026-02-25  
**Purpose:** Proof-first cleanup log. Each row: candidate, evidence, decision, rollback. No deletion without evidence and rollback path.

## Format

| Candidate | Evidence | Decision | Rollback |
|-----------|----------|----------|----------|
| (see below) | | | |

## Automation output retention

| Candidate | Evidence | Decision | Rollback |
|-----------|----------|----------|----------|
| `output/automation/*.md` older than retention window | 520+ files; triage hourly + daily digests accumulate | Policy: keep triage 7d, digests/audits 30d; archive older to `output/automation/archive/YYYY-MM/` | Restore from archive; adjust `scripts/archive-automation-outputs.mjs` if needed |
| Script `scripts/archive-automation-outputs.mjs` | New script; moves by date pattern | Added 2026-02-25 | Delete script; do not run |

## Knip / ts-prune findings (2026-02-25)

| Candidate | Evidence | Decision | Rollback |
|-----------|----------|----------|----------|
| Unused dependencies (45) | knip report | Defer; many may be transitive or dynamic (Radix, next-auth, etc.) | N/A |
| Unused devDependencies (6) | knip report | Defer; ts-prune/madge used for one-off audits | N/A |
| Unresolved import `../lib/credits` in `scripts/migrations/test-grant-credits.ts` | knip | Fix path or add to ignore | Revert script |
| Unresolved import `../lib/feed-planner/resolve-subject-identity` in `scripts/qa-phase2e-feed-subject-identity.ts` | knip | Fix path (e.g. `@/lib/feed-planner/resolve-subject-identity`) | Revert script |
| Unresolved imports in test-maya-*-restoration.ts (`@/lib/maya/personality*`, `personality-enhanced`) | knip | Fix or skip scripts if modules removed | Revert script |

## High-confidence cleanup targets (documented; delete only with approval)

| Candidate | Evidence | Decision | Rollback |
|-----------|----------|----------|----------|
| `.backups/` directory | 32 files; phase backups, agent-code-backup-jan31 | Defer; listed in knip ignore and codebase-indexer skip | `git checkout -- .backups` |
| `output/agents/` (manifest, chunks, reports) | Stale repo_root; .backups in chunks | Defer; AGENT_EVIDENCE_CLASSIFICATION marks as stale; keep for theme reference | `git checkout -- output/agents` |
| `backup-before-cleanup/` | Not present in repo (0 files) | N/A | N/A |

## Resolved / completed

| Candidate | Evidence | Decision | Rollback |
|-----------|----------|----------|----------|
| Revenue/subscription report classification | O-02 | Done in audit-revenue-sources.mjs and audit-subscription-data.mjs | Revert added "Classification" section in both .mjs |

## Change log

| Date | Change |
|------|--------|
| 2026-02-25 | Ledger created; retention policy and script added; knip findings logged; .backups and output/agents deferred. |
