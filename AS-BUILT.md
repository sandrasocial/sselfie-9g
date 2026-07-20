# AS-BUILT (verified facts)

**Purpose:** Ground truth for this repo. **Do not trust unverified numbers in other markdown files.**

**Verified:** 2026-07-13 · **Release:** Maya one-step first-selfie experience

| Field | Value |
|--------|--------|
| **Git remote** | `https://github.com/sandrasocial/sselfie-9g` |
| **Vercel project** | `sselfie-9g` — live at `https://sselfie.ai` |
| **Package name** | `my-v0-project` (npm name; product is SSELFIE Studio mothership) |
| **Product** | SSELFIE Studio (mothership), live production |
| **Architecture** | **`lib/maya/` is not compatible** with `agents-sselfie`. Do not copy Maya trees between repos. |

## App v3 (verified 2026-07-13)

Members use `/app` (Studio 3.0) since the APP-CUTOVER-01 Phase 2 cutover: `APP_V3_MEMBERS_ENABLED=true` set in Vercel production 2026-06-10 (verified via `vercel env ls`). Image generation flagship = **`gpt-image-2` via OpenAI API** (`app/api/app-v3/maya/generate/route.ts`). Legacy `/studio` (Replicate: Flux LoRA + Nano Banana Pro) is retired but still in the repo. Rollback = flip the env to `false`.

The live Maya first-result path is governed by
`docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md`: returning Create leads with one
personalized recommendation, Maya chooses the default Vault world, the first concept leads, a real
download records value, and one next recommendation continues the visibility workflow. Active Maya
drafts restore their latest generation and creation choices. Workspace switching is blocked while a
render or text refinement is in flight.

The first-selfie handoff commits `photo + Maya decides` before Maya opens. After the customer
confirms one selfie, Maya goes directly to one recommended concept. Pre-result format/style/shot,
shoot-size, model-source, extra-angle, inspiration, Change, and composer controls are not shown.

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

Refresh live metrics from **Stripe, the database, provider dashboards, and production**. Do not use
numbers from this file unless you re-verify them yourself.

## Security baseline (verified 2026-07-12)

- The active Neon database password was rotated and propagated to Vercel production/preview.
- A legacy Neon source credential found in public Git history was rotated; intentional local access
  now uses the untracked `SOURCE_DATABASE_URL` environment variable.
- The exposed Stripe webhook signing secret was replaced with a new production endpoint; the old
  endpoint is disabled.
- Current tracked files are guarded by `tests/no-hardcoded-secrets.test.ts`.
- The guard also blocks hardcoded OpenClaw gateway tokens. The retired North/OpenClaw/Telegram
  runtime is absent from the repo, and the local zero-job OpenClaw gateway launch agent is disabled.
- Public Git history still contains the revoked values. They are no longer valid; rewriting public
  history is not required for runtime safety and must not be attempted as a routine cleanup.
