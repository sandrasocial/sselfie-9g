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

## How Maya gets stronger WITHOUT breaking this (direction, not license)

Sandra's product principle, recorded for every future Maya task:

> Maya should ask questions only when uncertainty is high. If confidence is high, act and
> explain: "I chose Quiet Luxury because that is your strongest performing world." Never
> remove control - hide it behind the default. One confident recommendation, an easy override.

That work lives in ROUTING and CONTEXT (what Maya already knows: vault, memory, calendar,
past picks), not in prompt text or models. It can proceed under the freeze. Every step that
would touch frozen surfaces waits for the golden regression suite
(`tasks/MAYA-GOLDEN-01-regression-suite.md`) so quality changes are measured, never felt.
