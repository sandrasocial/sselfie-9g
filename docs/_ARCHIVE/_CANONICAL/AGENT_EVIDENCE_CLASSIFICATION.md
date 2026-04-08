# Agent Evidence Classification (Trusted vs Stale)

**Created:** 2026-02-25  
**Purpose:** Normalize which agent artifacts inform the optimization backlog. Do not treat all output/agents content as current truth.

## Stale (do not use for file-level actions)

| Artifact | Reason |
|----------|--------|
| `output/agents/manifest.json` | `repo_root` points to `/Users/MD760HA/Desktop/sselfie-9g-1`; current repo is sselfie-9g. File list may not match workspace. |
| `output/agents/chunks.json` | Chunk groups include `.backups` and `backup-before-cleanup`; many chunk IDs reference backup paths not in active app. |
| Reports whose FILES_REVIEWED are only under `.backups/` (e.g. dev-architecture chunk-001) | Those paths are backup snapshots; live code lives under `app/`, `components/`, `lib/` without `.backups` prefix. |
| Any report that references `admin/academy/page.tsx` at 75KB inside `.backups` | Current app academy may differ; verify against `app/admin/` and `components/` in repo root. |

## Trusted for themes (revalidate against current code before implementing)

| Source | Trusted themes | Use for backlog |
|--------|-----------------|------------------|
| admin-business-ops chunk-126 (docs group) | Revenue/Stripe payment ID gaps; Maya chat fixes; prompt system canonicalization; UI/UX redesign risk; vibe library gaps; selfie converter imports | Yes — aligns with revenue-audit and subscription-audit. Map to O-01, O-02, O-06. |
| admin-business-ops chunk-080 (components group) | Maya chat state, localStorage, feed creation workflow, Pro vs Classic mode | Yes — for UX/activation (O-06). Revalidate hooks and components exist and behavior matches. |
| dev-architecture chunk-001 (.backups group) | Admin auth pattern (ADMIN_EMAIL), neon SQL usage, bulk email retry/rate limit need | Theme only — do not use file list. Map to O-07, O-08 (logging, retries). |

## Mapped into OPTIMIZATION_BACKLOG

- **Revenue / payment linkage:** Agent REVENUE_STRUCTURE_AUDIT and revenue-audit-*.md → O-01, O-02.
- **Cron/auth:** EXECUTION_STATUS Phase AO-4D → O-03.
- **Cleanup:** manifest/chunks reference to .backups + backup-before-cleanup → O-10 (artifact cleanup).
- **UX / first value:** Funnel and support digests + agent UI/UX and Maya findings → O-06.
- **Retries / logging:** Agent “bulk email retry/rate limit” and “structured logging” → O-07, O-08.

## Revalidation rule

Before implementing any backlog item that came from agent reports: confirm the referenced files and behavior in the **current** repo (grep, read_file, or run scripts). Do not assume paths or line numbers from chunk reports are still valid.
