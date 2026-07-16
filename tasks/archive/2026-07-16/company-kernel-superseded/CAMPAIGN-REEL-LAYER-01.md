# CAMPAIGN-REEL-LAYER-01 — the reel joins the campaign kit (Sandra-approved 2026-07-15)

Status: READY for Codex — build on `codex/campaign-outcome-held` alongside the polish items.
Sandra's yes with one law attached: **"this can not become another generic reel. That's the
whole point."** Feasibility target: clean by Thursday morning; if not, launch moves to
Friday rather than shipping a thin version (Sandra's explicit preference: honest beats
rushed).

## Why (one line)

Sandra grew 114K IG + 72K TikTok on reels and carousels, not photos — the kit must deliver
the format that actually builds visibility, or the founder herself doesn't believe the
promise.

## The deliverable added to every campaign

**"One reel, ready to assemble"** on the buyer page:

1. **Hook + script (15-30s)**: chosen from the proven-pattern corpus (viral-DNA hooks,
   40-180x baseline — same grounding as the posts), written FOR her promotion and audience
   from her intake answers. Includes ONE self-filmed clip instruction that is specific and
   one-take filmable on a phone ("film yourself closing your laptop and smiling at the
   camera, 5 seconds" — never "film some b-roll").
2. **2-3 AI b-roll clips generated from HER OWN campaign photos** via the EXISTING
   image-to-video pipeline (`lib/maya/video-generation-service.ts`, default Kling v3;
   `startVideoGeneration` with a campaign-outcome source). Motion prompts written by the
   generator to match the campaign's visual direction. Her face stays hers — the clips
   animate her real campaign photos; we never fabricate footage of her doing things she
   didn't film.
3. **Text overlay lines**: the exact words, in display order, matched to script beats.
4. **Assembly card**: clip order, where each overlay goes, total target length, audio note
   by TYPE only ("calm trending audio" — never a licensed-track promise).
5. **Reel caption + CTA** connected to her offer (same voice engine as the posts).

## Anti-generic laws (QA-enforced, not aspirational)

- The hook must name HER specific promotion or her buyer's situation. If the hook would
  work for any other woman's business unchanged, it FAILS QA.
- Banned reel patterns: "did you know", "stop scrolling", "3 tips to…", generic
  motivational voiceover, trend-chasing disconnected from her offer.
- Traceability required per reel: (a) which intake answers it was built from, (b) which
  corpus pattern the hook derives from — both visible in the admin QA queue next to the
  reel, so Sandra can verify non-genericness in seconds during founding-batch QA.
- Sandra QAs the reel like the photos: founding batch = every order.

## Build notes

- Generation is async (clips render in minutes on Replicate): campaign delivery WAITS for
  clips within the 48h budget; a failed clip retries once, then the reel ships with fewer
  clips and an honest note — a missing b-roll clip never blocks the whole campaign.
- Cost: cap 3 clips/campaign; business absorbs (campaign buyers are not credit-holding
  members — verify NO member-credit deduction path can fire from the campaign generation
  context; align with how campaign photos already render).
- Buyer page: new "Your reel" section (script card, downloadable clips, overlay lines,
  assembly card, caption + copy buttons). Copy DRAFT for Sandra. Downloads tracked like
  other assets (`reel_*` asset types).
- Update `lib/campaign-outcome/types.ts` + schema + generator + delivery email line
  ("your reel, scripted and ready to assemble") + the landing page itemized list.
- Tests: schema round-trip, clip-failure degradation path, traceability fields present,
  no-credit-deduction assertion. Full suite + type-check + check:voice.

## Out of scope

Rendering the final assembled video (she assembles in the IG editor or CapCut in minutes —
v1 delivers professional ingredients, not a rendered file). Music licensing. Any synthetic
footage of the buyer beyond animating her own campaign photos. TikTok-specific variants
(the same reel posts there — her own repost model).
