# AS-BUILT (verified facts)

**Purpose:** Ground truth for this repo. **Do not trust unverified numbers in other markdown files.**

**Verified:** 2026-04-07 · **Commit:** `ef87920a` (run `git rev-parse --short HEAD` to refresh)

| Field | Value |
|--------|--------|
| **Git remote** | `https://github.com/sandrasocial/sselfie-9g` |
| **Package name** | `my-v0-project` (npm name; product is still SSELFIE Studio mothership) |
| **Product** | SSELFIE Studio (mothership), live production |
| **Architecture** | **`lib/maya/` is not compatible** with `agents-sselfie` or `sselfie-studio-v2`. Do not copy Maya trees between repos. |

## Mechanical checks

```bash
node scripts/verify-repo-invariants.mjs
```

## Cross-repo

| Repo | Notes |
|------|--------|
| `agents-sselfie` | Separate live product (AGENTS). Sync policy: `agents-sselfie/SYNC.md`. |
| `sselfie-studio-v2` | Studio rewrite fork line. Not a feature-complete port of this repo. |

Refresh live business metrics from **Stripe / dashboard / `CLAUDE.md`**, not from this file, unless you re-verify.
