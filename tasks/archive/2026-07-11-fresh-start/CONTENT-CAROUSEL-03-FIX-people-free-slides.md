# CONTENT-CAROUSEL-03-FIX - Remove the faceless slide concept (no object/text-only slides)

OWNER: Codex (Sandra approves merge)

Status: ready. Post-review fix from CAROUSEL-03 (commit 80c48b9e). Corrects a wrong assumption.

## The correction (Sandra 2026-06-15)
There are NO "object-only" or "text-only" slides. Every carousel slide is a real image — her
(photoshoot/identity) or, for tutorials, a real screenshot — redesigned in the SSELFIE editorial
style. The `detail` (faceless object/still-life) and `text-only` (faceless text card) slide types,
and the `NO_PEOPLE` prompt, are leftovers from the rejected text-card approach. Remove them.

## Fix
- In the customer carousel compiler (`lib/app-v3/prompt-compiler.ts`): remove the `detail` and
  `text-only` carousel slide visual types and the `NO_PEOPLE` constraint. Every carousel slide is
  a real-image redesign featuring the person (generated from her/the member's selfie, photoshoot
  style) — or a real reference frame. If a slide is a "statement/hook," it is still a real photo of
  her with baked editorial text, never a faceless card.
- Remove the now-moot `input: "none"` faceless path and the selfie-on-NO_PEOPLE contradiction
  entirely (not by reverting to `none` — by deleting the faceless-slide concept).
- Mirror this in the admin carousel/story generators if any faceless `detail`/`text-only` slide
  kind remains (`lib/content-kit/*`, `lib/app-v3/maya/concept-types.ts`, `carousel-design-systems.ts`).
- Update tests: assert carousel slides are person/real-reference redesigns; no `detail`/`text-only`
  faceless types, no `NO_PEOPLE`.

## Acceptance
- No faceless object-only or text-only slides anywhere. Every slide = a real image redesigned in
  the editorial style (her photoshoot / her screenshot), text baked by the image model.
- No selfie attached to a no-people prompt (the concept is gone). Build/tests/invariants green.

## Note
Confirm scope with the CAROUSEL-03 doctrine: image-to-image redesign of real references only.
