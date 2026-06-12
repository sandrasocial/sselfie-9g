# SSELFIE Story Slide Doctrine
*Sandra's own spec (her "Story Prompt Engineer" custom GPT), captured verbatim-in-essence
2026-06-12. This is the writing + visual doctrine behind the Content Kit story engine
(`lib/content-kit/story-generator.ts`). If the code and this doc disagree, this doc wins.*

## Emotional core

Audience transformation: FROM "I don't know where to start, I'm scared of being judged,
I don't feel ready" TO "I know how to show up, tell my story, and become recognizable
online using my phone." Visibility is the method. Income is the outcome. Confidence is
the emotional bridge. Core belief: **a woman with a phone and a story is unstoppable.**

## Story strategy framework (slide roles, in sequence)

1. **Hook** — stop the viewer, make her feel seen. Bold, minimal, scroll-stopping.
2. **Tension** — name the hidden fear. Intimate, honest, relatable.
3. **Shift** — a new way of seeing it. A realization, an identity shift.
4. **Proof** — it works / people want it. Credible, clear, exciting.
5. **Teaching** — one tiny lesson. Clean, useful, save-worthy.
6. **Desire** — paint the future identity. Aspirational, cinematic.
7. **Bridge** — product as the natural next step. Helpful, never salesy.
8. **CTA** — one clear action. Keyword is the largest text element.

Sequences sell through storytelling, not constant teaching. Rotate emotional roles so
sequences never feel repetitive: same visual system, different emotional job per slide.

## Slide text rules

- Short lines, strong spacing, one clear idea per slide, easy to read fast on mobile.
- Emphasize only 1-3 phrases per slide (e.g. "visible online", "still becoming her",
  "You stop hiding", "Selfie Starter Kit", "KIT", "PROMPT").
- Voice: best-friend energy, warm, direct, emotionally specific, short punchy lines.
  No corporate language, no empowerment fluff, no m-dashes, minimal emojis.
- Never the word "reinvention".

## CTA architecture

1. Desire question ("Want the exact prompts I used?")
2. Action ("DM me:")
3. Keyword — LARGEST element ("PROMPT" / "KIT" / "START")
4. Reassurance ("and I'll send them over.")

Keyword gets the hand-drawn circle; small arrow toward "DM me"; tiny note "I'll send it".

## Visual identity

Clean luxury editorial. Vogue/Chanel adjacent. Black, white, charcoal, cream, warm gray,
soft neutrals ONLY. Elegant serif for emotional statements (Cormorant Garamond), clean
sans for support (Inter), handwritten marker style for tiny accents only (Caveat in the
renderer). No pink/purple/bright colors, no childish stickers, no Canva-template energy.

## Doodle rules

2-4 per slide, each with a JOB: soft underline under the identity phrase, imperfect
circle around the keyword, tiny arrow toward the action, handwritten note that deepens
the emotion ("this is the shift", "I get it", "I'll send it"), crossed-out limiting
belief, delicate spark lines. Chic and intentional, never sticker-clutter.

## Identity preservation (now structural, not prompted)

Her old flow re-generated the photo through ChatGPT's image model with preservation
language ("Preserve Sandra's real facial structure... do not beautify her into a
different person"). The Content Kit story renderer makes this structural: **the photo is
never regenerated — it is the untouched background layer**, and text/doodles render
deterministically on top. Identity preservation is guaranteed by architecture. The old
prompt-pack flow remains valid for ad-hoc ChatGPT use.

## Layout rules

Text in clean negative space (upper/center/lower left preferred, or over a softly
darkened area). Never cover the face, eyes, hands, phone, or key visual details.
CTA slides: centered in the cleanest area. Strong hierarchy: lead serif largest,
support sans smaller, keyword largest of all, handwritten notes tiny.
