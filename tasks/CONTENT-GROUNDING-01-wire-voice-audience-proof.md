# CONTENT-GROUNDING-01 - One Voice/Audience/Proof Source, Wired Into Every Generator

OWNER: Codex (Sandra approves merge)

Status: spec ready. Source: Maya/admin content audit 2026-06-15. Fixes the founder report that
the weekly brief, shoot studio, carousel kit, and story sequences "don't sound like me, don't know
my audience's desires/pain points, and aren't backed by proof of what works."

## Root cause (from the audit)
No code reads the `.md` docs at runtime. Every grounding fact was hand-retyped into separate
TypeScript constants (`SANDRA_VOICE_RULES` in brief-generator, `MAYA_VOICE` in core-personality,
`ADMIN_MAYA_CONTRACT` in admin-persona), so they drift, and each generator reads a different thin
slice. The strongest assets (the 156-reel viral DNA, the audience poll, the DM pain points) reach
almost none of the generators.

## Source of truth (APPROVED — ready to build)
The canonical content is **`docs/brand/SSELFIE_CONTENT_GROUNDING.md`** (STATUS: APPROVED
2026-06-15). Encode from the doc verbatim in intent; do not paraphrase away her voice. The
signature promise is locked: "Look like yourself, at your best." "elevate/elevated" is fully
banned (include it in `BANNED_WORDS`).

---

## 1. Create the single source of truth: `lib/content/grounding.ts`
Encode `SSELFIE_CONTENT_GROUNDING.md` as structured, exported constants (this becomes THE module
every generator imports). Suggested shape:

- `SANDRA_VOICE` — north star, always/never rules, recognition arc, high-signal phrases (for
  few-shot), format rules.
- `BANNED_WORDS: string[]` — the consolidated locked list (incl. elevate/elevated, leverage,
  synergy, transform, game-changer, skyrocket, unlock, level up, robust, scalable, etc.) +
  the no-fake fear-trigger phrases. Export as an array so guards can reuse it.
- `APPROVED_LANGUAGE` — the use-instead list.
- `AUDIENCE` — who she is, desires ranked (Money 45 / Confidence 23 / Time 23 / Visibility 9),
  the pain points, the five fears table, what she's buying, and the reach-vs-desire truth
  (tutorials = reach engine, income/story = desire/conversion engine).
- `PROOF` — the 5-element viral DNA + reel checklist, the flop list, weighted pillars
  (40/30/20/10), cover-text system, signature series, repost engine.
- `FUNNEL` — current ladder: Free AI Prompts -> Vault $27 -> SUITE €97 (+ supporting Selfie Guide
  free, Starter Kit $37, Masterclass $147). Keyword map SELFIE/PROMPT/ANDROID.
- `NO_FAKE` — reframe, red/green flags, Real You Method, signature lines (incl. the new promise),
  binding language rules.
- Helper builders so generators don't each re-string it:
  `voiceBlock()`, `audienceBlock()`, `proofBlock()`, `noFakeBlock()`, and a `groundingSystemPrompt()`
  that composes the voice + no-fake as a SYSTEM-role persona.

Keep each block concise (these go into LLM prompts; watch token cost). The doc is the human
mirror; this module is the machine source. Add a one-line comment in each pointing to the doc.

## 2. End the drift: make existing copies import from grounding
- `lib/content-engine/brief-generator.ts` `SANDRA_VOICE_RULES` -> delete, import `voiceBlock()` /
  `BANNED_WORDS` from grounding.
- `lib/app-v3/maya/admin-persona.ts` — its hand-distilled viral DNA / pillars / cover system
  should import from `PROOF` (and `NO_FAKE`) so it can't drift from the doc. Keep the admin-only
  framing, source the facts from grounding.
- `lib/maya/core-personality.ts` `MAYA_VOICE` language rules -> source the banned-word list and
  no-fake language from grounding (member voice/personality stays, but the binding rules come from
  one place). Coordinate with MAYA-FIX-02 #4 (brain slim) so these don't fight.

## 3. Wire each generator (this is the fix Sandra feels)

### Weekly brief — `lib/content-engine/brief-generator.ts`
- Inject `PROOF` (the 5-element DNA, flop list, weighted pillars, cover system, repost engine) into
  the system prompt. Require every recommended reel to satisfy all 5 DNA elements and forbid the
  known-flop formats. (Audit F1.)
- Inject `AUDIENCE` + `FUNNEL`. Add an explicit instruction: "Read `audience.dmSamples` and
  `audience.dmIntents`. Every `dmThemes` entry MUST quote/paraphrase a real DM. Anchor at least 2
  pieces to a specific pain point found in the DMs." (Audit F3.)
- Teach the full ladder incl. €97 SUITE; when copy-to-purchase ratio in `vaultActivity` is weak,
  instruct a conversion move. (Audit F4.)
- Demote the live `researchMemo` to tiebreaker only: "her own viral DNA + top posts win on
  conflict." (Audit F5.)

### Carousel — `lib/content-kit/carousel-generator.ts`
- Add the `AUDIENCE` block (desires + pain points + the five fears). Today its only audience line
  is "women entrepreneurs." (Audit C1, P0.)
- Inject `PROOF` carousel guidance (the 10 proven carousel concepts / save-bait patterns, cover
  system) instead of relying solely on possibly-empty live winners. (Audit C2.)
- Import the design systems from `lib/app-v3/maya/carousel-design-systems.ts` +
  `overlay-styles.ts` so admin carousels get the serif/palette/no-gradient direction. (Audit D1.)
  Coordinate with MAYA-FIX-03 (text becomes a composited layer, not baked in).

### Story — `lib/content-kit/story-generator.ts`
- Keep its strong existing audience paragraph (it's the model). Add a one-line NO-FAKE reminder
  inside the desire/bridge beat so identity content doesn't drift into "become someone new."
  (Audit S2.) Add light `PROOF` awareness (story = supporting pillar, needs the keyword/capture
  mechanic). (Audit S3.)

### Shoot — `lib/content-kit/shoot-generator.ts`
- Keep the strong no-fake image guards. Add a light `AUDIENCE` line scoped to the
  `whenToUse`/posting-guidance fields only (keep the prompt BODY generic). (Audit SH2.)
- Make shoot creation aware of which shot types feed the viral formats (full-body / everyday
  location / before-after), since shoots are the unit everything else spins from. (Audit SH3.)

## 4. Voice as a system role + banned-word guard
- `lib/content-kit/llm.ts` currently sends everything as a single USER message with no system
  prompt. Pass `groundingSystemPrompt()` as a real SYSTEM message so voice is reinforced as
  persona, not buried in user content.
- Add a deterministic guard usable by all generators (and the caption writer from MAYA-FIX-02 #3):
  a function that scans output for `BANNED_WORDS` + m-dashes and flags for a rewrite pass. One
  shared implementation, fed by grounding's `BANNED_WORDS`.

## Acceptance
- One module (`lib/content/grounding.ts`) is the only place voice/audience/proof/funnel/no-fake
  facts live; the three former hand-copies import from it (no duplicated rule lists).
- Brief output: every reel idea satisfies the 5-element DNA, references a real DM pain point, and
  the plan reasons about the €97 ladder. No banned words, no m-dashes.
- Carousel/story/shoot outputs reflect the audience's real desires + pain points and the no-fake
  doctrine; carousels use the on-brand design systems.
- "elevate/elevated" appears in NO generated output; signature promise is "Look like yourself, at
  your best."
- Existing tests pass; add a test asserting `BANNED_WORDS` includes "elevate" and that the guard
  catches it. Lint + build clean.

## Notes
- No money/admin-data-contract change. `vaultActivity.purchases` stays a behavior/demand signal
  (analytics_events), never relabeled as revenue.
- Sequencing: this pairs with MAYA-FIX-03 (text layer) for the "overlays look off" half and
  MAYA-FIX-02 #3/#4 (caption guard + brain slim). Can land independently of FIX-01.
