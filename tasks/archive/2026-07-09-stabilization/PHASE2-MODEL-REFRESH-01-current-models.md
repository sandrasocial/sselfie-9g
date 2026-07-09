# PHASE2-MODEL-REFRESH-01 — Update stale hardcoded model IDs to the current family

Date: 2026-07-09
Owner: Codex
Priority: 2 — safe to run NOW in parallel with PHASE2-CLEANUP-01, but higher-risk than that spec
because one of the touched files (`lib/maya/openrouter.ts`) is the central routing function
nearly every AI call in the product goes through. Do not rush this one.

## Why

Verified 2026-07-09: the current model family is Sonnet 5 (`claude-sonnet-5`, released
2026-06-30) and Opus 4.8. Every model ID hardcoded in this repo predates that release
(`claude-sonnet-4-5`, `claude-3-7-sonnet-20250219`, `claude-3-5-haiku-20241022`, OpenRouter slug
`anthropic/claude-sonnet-4.5`). None of these are broken today, but the repo should run on the
current, best-available models rather than silently aging out of date.

## Do NOT guess the exact ID strings

Direct Anthropic API model IDs and OpenRouter model slugs are not always the same string
(OpenRouter prefixes with the provider, e.g. `anthropic/claude-sonnet-5`, and version-number
formatting has differed between releases before, e.g. `4-5` vs `4.5`). Before changing anything:

1. Query Anthropic's live models endpoint (or check `platform.claude.com/docs/en/about-claude/models/overview`)
   for the exact current direct-API model ID strings (Sonnet 5, Opus 4.8, and whatever Haiku-tier
   ID is in current use).
2. Query OpenRouter's live model list (`https://openrouter.ai/api/v1/models` or the OpenRouter
   dashboard) for the exact current slug for the same models.
3. Use those verified strings. If either can't be confirmed live, stop and flag it rather than
   guess — a wrong slug fails every AI call in the product silently or loudly, and this repo
   already had one real incident this cycle (IG-agent drafting silently degrading to a canned
   fallback) caused by exactly this class of model-selection bug.

## Files with stale model IDs (grep-confirmed 2026-07-09 — re-check before starting, this list may
have shifted)

- `lib/maya/openrouter.ts` — **the highest-leverage file**: `OPENROUTER_TO_ANTHROPIC_ID` mapping,
  `getMayaModelForTask`, and any hardcoded fallback IDs. This function is what
  `createMayaOpenRouterModel`/`createMayaAnthropicModel` resolve through for member Maya,
  content-kit generators, and the IG-agent responder (fixed 2026-07-09, commit b3266fd0) — a
  mistake here has the widest blast radius in the repo.
- `app/api/cron/cron-health-check/route.ts` — the AI-credit-canary's 1-token test call model.
  Low risk (cheap, isolated), but should still run on a current model so the canary itself
  doesn't silently test an aging/deprecated endpoint.
- `lib/this-week/trends.ts` — the member-facing "This Week" trend digest's Anthropic/OpenRouter
  calls.
- `lib/content-kit/llm.ts` — `ANTHROPIC_MODEL`/`OPENROUTER_MODEL` constants used by the
  carousel/story generators.

**Do NOT touch** `lib/admin/daily-briefing-intelligence.ts`, `lib/content-engine/brief-generator.ts`,
or `lib/admin/post-now.ts` — all three are being deleted (either in `PHASE2-CLEANUP-01` or the
still-gated `PHASE2B` spec), so updating their model IDs is wasted work.

## Verification (required before merge — this is not optional given the file's blast radius)

- After updating `lib/maya/openrouter.ts`, run a REAL smoke-test call (not just a mocked unit
  test) through at least one live path that depends on it — e.g. a member Maya chat message, or
  the ig-agent responder against a test conversation — and confirm a real, non-error response
  comes back before merging.
- Full existing test suite green (mocked model-ID assertions in tests will need updating to the
  new strings — update them, don't loosen them to accept anything).
- Full suite green before merge (standing rule this cycle: always full-suite-verify, not just the
  files touched — this repo has had two stale-test-merge incidents already).

## Acceptance

- Every model ID string in the files above matches a live-verified current Anthropic/OpenRouter
  identifier, cited in the PR description with the source checked (docs URL or API response).
- One real smoke-test transcript/log included in the PR description proving the new model ID
  actually resolves and responds.
- No behavior change intended beyond the model swap itself — don't refactor `openrouter.ts`'s
  routing logic while you're in there.
