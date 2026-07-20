# Maya Creative Freeze (2026-07-15)

Sandra's decision after the 2026-07-15 quality scare: Maya's creative intelligence is FROZEN
while UX work continues. UI problems and creative-pipeline problems are separate systems and
are never fixed in the same change.

## The forensic verdict that triggered this (evidence, 2026-07-15)

A member's test "felt off, generic, lighting off". Full comparison against yesterday found NO
regression anywhere in the creative pipeline:

- Compiled prompts stored with real member images are framework-identical between July 14 and
  July 15 (line-level diff; only per-concept content differs). Prompt version marker unchanged:
  `maya-june11-restoration-v1`.
- Core prompt files unchanged since July 7 or earlier: `lib/app-v3/prompt-compiler.ts`,
  `lib/app-v3/maya/{visual-rules,ingredients,persona,creative-plan,vault-styles*}.ts`.
- Concept-writer model routing (`lib/maya/openrouter.ts`) unchanged since the July 9 bump.
- Image model + quality/size envs untouched (OPENAI_IMAGE_MODEL 56 days old, APP_V3 quality
  envs 9-13 days old).
- July 14-15 commits touching Maya paths were UX plumbing, credits, and video-reel work only.
- Two deliberate July 13 changes exist, both Sandra-approved and locked: "Maya chooses the
  look" (Invisible AI contract) and the likeness-phrasing swap enforced by check:voice.

Conclusion: the off-feeling image was concept variance (Stage 1 writes a fresh scene each
time) plus normal image-model variance - and the member had also swapped her primary selfie
between sessions, which changes likeness/lighting legitimately. One image is noise. Nothing
gets changed without statistical evidence.

## Freeze rules (until Sandra lifts them)

While the freeze holds, NO change to:

- prompt text or prompt assembly (`lib/app-v3/prompt-compiler.ts`, `lib/app-v3/maya/*`,
  `lib/maya/prompt-templates/*`, system prompts in `app/api/app-v3/maya/chat/route.ts`)
- model routing or parameters (`lib/maya/openrouter.ts`, `OPENAI_IMAGE_MODEL`, size/quality
  envs, thinking/reasoning settings)
- vault retrieval and style selection
- memory injection (likeness notes, brand profile blocks)

Allowed: routing, UX, buttons, labels, credits, bug fixes that do not alter what reaches a
model. If a UX fix NEEDS a prompt change, it stops and goes to Sandra first.

## Enforcement (mechanical, not honor-system)

`tests/maya-prompt-framework-freeze.test.ts` snapshots the full compiled prompt for fixed
briefs plus the shared visual-rule blocks. Any drift in the framework fails the suite. A
failing freeze test may only be resolved by a deliberate, Sandra-approved prompt change that
updates the snapshot in the same commit and names the change in the commit message.

## The two tracks (locked 2026-07-15)

**Track A: Maya Core (protected).** Prompt compiler, identity rules, visual rules, persona
prompt text, Vault DNA, image pipeline, model routing. Changes only after passing the golden
regression suite, one at a time, named in the commit.

**Track B: Maya Experience (active).** Conversation flow, recommendations, memory, calendar,
campaign logic, routing, UI, decision reduction, explanations, celebration moments. This is
where Maya gets dramatically smarter, fast, without touching the creative engine.

The north star for Track B: every month Maya should need FEWER instructions from the member
while producing BETTER outcomes.

## Personality freeze (behavior, not just prompts)

Maya behaves like a senior creative director. Any Track B change must preserve ALL of these:

- She assumes competence and makes confident recommendations.
- She explains why: "I chose Quiet Luxury because that is your strongest performing world."
- She asks only when uncertainty is high; if confidence is high she acts.
- She remembers previous work and builds campaigns, not isolated assets.
- She protects identity above everything.
- She prefers one strong recommendation over five equal choices.
- She teaches by doing, not by lecturing.
- Control is hidden behind the default, never removed: one confident recommendation, an easy
  override.

A change that makes Maya ask more, explain less, or present menus instead of decisions is a
personality regression even if every test stays green.

## When something "feels off" (the process, in order)

Founder intuition -> regression test -> evidence -> decision.

Sandra's pattern recognition across tens of thousands of SSELFIE images is a real signal and
is never dismissed - it triggers a golden regression run, not a change. One image is noise;
twenty scored generations are evidence. Changes happen only after the evidence agrees, and
image models themselves can drift over time, so the visual baseline gets rerun periodically
even when nothing in the repo changed.

All of this can proceed under the freeze because it lives in ROUTING and CONTEXT (what Maya
already knows: vault, memory, calendar, past picks), not in prompt text or models. Every step
that would touch frozen surfaces requires the golden regression tests, including
`tests/maya-prompt-framework-freeze.test.ts`, so quality changes are measured, never felt.
