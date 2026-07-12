# AS-BUILT (verified facts)

**Purpose:** Ground truth for this repo. **Do not trust unverified numbers in other markdown files.**

**Verified:** 2026-07-12 · **Release:** growth-machine hardening

| Field | Value |
|--------|--------|
| **Git remote** | `https://github.com/sandrasocial/sselfie-9g` |
| **Vercel project** | `sselfie-9g` — live at `https://sselfie.ai` |
| **Package name** | `my-v0-project` (npm name; product is SSELFIE Studio mothership) |
| **Product** | SSELFIE Studio (mothership), live production |
| **Architecture** | **`lib/maya/` is not compatible** with `agents-sselfie`. Do not copy Maya trees between repos. |

## App v3 (verified 2026-06-11)

Members use `/app` (Studio 3.0) since the APP-CUTOVER-01 Phase 2 cutover: `APP_V3_MEMBERS_ENABLED=true` set in Vercel production 2026-06-10 (verified via `vercel env ls`). Image generation flagship = **`gpt-image-2` via OpenAI API** (`app/api/app-v3/maya/generate/route.ts`). Legacy `/studio` (Replicate: Flux LoRA + Nano Banana Pro) is retired but still in the repo. Rollback = flip the env to `false`.

## Mechanical checks

```bash
node scripts/verify-repo-invariants.mjs
```

## Cross-repo

| Repo | Notes |
|------|--------|
| `agents-sselfie` | Separate live product (SSELFIE AGENTS). Sync policy: `agents-sselfie/SYNC.md`. |

## Branches

GitHub has only `main`. Local task branches are short-lived and must be deleted after merge. Codex
hosts no business automations and no long-lived automation worktree is required.

## Business metrics

Refresh live metrics from **Stripe / dashboard / `CLAUDE.md`** — do not use numbers from this file unless you re-verify them yourself.

## Security baseline (verified 2026-07-12)

- The active Neon database password was rotated and propagated to Vercel production/preview.
- A legacy Neon source credential found in public Git history was rotated; intentional local access
  now uses the untracked `SOURCE_DATABASE_URL` environment variable.
- The exposed Stripe webhook signing secret was replaced with a new production endpoint; the old
  endpoint is disabled.
- Current tracked files are guarded by `tests/no-hardcoded-secrets.test.ts`.
- Public Git history still contains the revoked values. They are no longer valid; rewriting public
  history is not required for runtime safety and must not be attempted as a routine cleanup.
