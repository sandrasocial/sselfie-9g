# AS-BUILT (verified facts)

**Purpose:** Ground truth for this repo. **Do not trust unverified numbers in other markdown files.**

**Verified:** 2026-04-09 · **Commit:** `aa2e5274` (run `git rev-parse --short HEAD` to refresh)

| Field | Value |
|--------|--------|
| **Git remote** | `https://github.com/sandrasocial/sselfie-9g` |
| **Vercel project** | `sselfie-9g` — live at `https://sselfie.ai` |
| **Package name** | `my-v0-project` (npm name; product is SSELFIE Studio mothership) |
| **Product** | SSELFIE Studio (mothership), live production |
| **Architecture** | **`lib/maya/` is not compatible** with `agents-sselfie`. Do not copy Maya trees between repos. |

## Mechanical checks

```bash
node scripts/verify-repo-invariants.mjs
```

## Cross-repo

| Repo | Notes |
|------|--------|
| `agents-sselfie` | Separate live product (SSELFIE AGENTS). Sync policy: `agents-sselfie/SYNC.md`. |

## Branches

Only `main` branch exists (local + remote). All `codex/` branches are short-lived feature branches — merged or deleted. Never leave stale branches open.

## Business metrics

Refresh live metrics from **Stripe / dashboard / `CLAUDE.md`** — do not use numbers from this file unless you re-verify them yourself.
