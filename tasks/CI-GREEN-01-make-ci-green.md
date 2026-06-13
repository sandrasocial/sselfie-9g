# CI-GREEN-01 — Make CI green-able (keystone for the autonomous loop)

OWNER: codex (spec by Claude 2026-06-13; top priority — the loop's auto-merge gate depends on it)

> Why this is #1: `tasks/LOOP_PROTOCOL.md` makes "CI green" the gate for Tier-0 auto-merge
> and a necessary condition for Tier-1. But CI is RED on `main` today, so the gate can never
> pass and NOTHING auto-merges (and human merges fight a red required check, e.g. PR #52).
> Fixing this unblocks the entire system. This is code work (Codex), Claude reviews (Tier 0).

## The problem (verified 2026-06-13)

`.github/workflows/ci.yml` runs, on every PR and push to main:
1. `pnpm tsc --noEmit --project tsconfig.ci.json` — scoped type-check (this one passes).
2. `pnpm lint` (`eslint . --max-warnings 99999`) — **FAILS**: 4 real errors on main.
3. `pnpm test --run` (full vitest) — **FAILS**: ~81 tests across ~45 files.

So the "Type-check·Lint·Test" check is red on `main` itself. "CI green" is currently impossible.

## Part 1 — Fix the 4 lint errors (trivial, do first)

`react/no-unescaped-entities`, all on main:
- `app/claim/[token]/page.tsx:29` and `:33` — unescaped `'`.
- `components/admin/content-brief-client.tsx:207` (x2) — unescaped `"`.
Escape them (`&apos;` / `&quot;` etc.) or rewrite the strings. After: `pnpm lint` → 0 errors.

## Part 2 — Get `pnpm test --run` green (triage, don't cheat)

~81 failing tests / ~45 files, reported as stale (retired files/pages, old copy/UI
expectations). Triage each FAILING suite into one of:
- **Stale → quarantine:** the test covers a retired/deleted feature or intentionally-changed
  copy. Remove the test, or exclude the file in the vitest config, and log it in a
  `tests/QUARANTINE.md` with the reason. (Excluding ≠ deleting coverage of live code.)
- **Real → fix:** the test covers LIVE code with a drifted expectation. Fix the expectation
  (or the code, if it's a genuine bug — flag those separately).

### Hard guard (do NOT skip these to go green)
Tests covering **payment / webhook / auth / access / entitlement** code must be FIXED, never
quarantined — the loop's Tier-1 gate trusts them. If one of those is failing for a real
reason, that's a bug to surface (OWNER: sandra note), not a test to silence. List every
quarantined file so Claude can confirm none are money/access tests.

## Acceptance
- [ ] `pnpm lint` → 0 errors.
- [ ] `pnpm test --run` → green (or green minus an explicitly-listed `tests/QUARANTINE.md`,
      none of which are payment/webhook/auth/entitlement suites).
- [ ] `pnpm tsc --noEmit --project tsconfig.ci.json` still passes.
- [ ] The "Type-check·Lint·Test" GitHub check passes on a fresh PR (proves CI is green-able).
- [ ] `tests/QUARANTINE.md` documents every excluded suite + why.

## After this lands
The loop's auto-merge gate becomes real. Tier-0 PRs auto-merge on green; Tier-1 (incl. the
held WEBHOOK-01 membership slice / PR #52) can merge on green without an admin override.

## Note on the broken GitHub runner
Separately, the GitHub "Type-check·Lint·Test" job has also failed *logless in ~2s* (a runner/
infra issue, distinct from the code failures above). If it keeps failing with no log after the
code is fixed, that's an infra problem to raise with the repo/Vercel settings, not a code fix.
