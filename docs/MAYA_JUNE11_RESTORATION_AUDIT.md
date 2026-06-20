# Maya June 11/12 Restoration Audit

Last updated: 2026-06-20
Branch: `codex/maya-june11-restoration`

## Baseline Comparison

| Area | June 11 end-of-day (`87781963`) | June 12 additions | Current branch |
| --- | --- | --- | --- |
| Photo prompt path | `/api/app-v3/maya/generate` compiled one photo job from setting, outfit, pose, camera, lighting, mood, identity lock, realism, avoid list. | Same path, with more app-v3 surfaces added around it. | Preserved OpenAI edit route and strengthened the same brief order through shared SSELFIE photo rules. |
| Graphic / reel / story / carousel prompt path | `compileConceptJobs` handled `photo`, `reel-cover`, `carousel`, `story-slide`; graphics were concise and SSELFIE-branded. | Content-kit redesign path and admin tools were added. | User graphics and admin content-kit renders share `lib/app-v3/maya/visual-rules.ts`; content-kit final image prompt is now exported/tested. |
| Inspiration handling | Inspiration was intended as close pose/style/composition guidance, selfie stayed identity. | Later behavior became looser and described inspiration as guidance only. | First photo/hero shot gets close-recreation instruction; photoshoot follow-up shots get same-world variation instruction. |
| Carousel schema | Simpler prompt path with fewer validation gates. | Creative Plan validation introduced for richer carousels. | Validation kept; server normalizer can build slides from complete Creative Plan outputs when legacy `slides` is thin. |
| Story path | User-facing `story-slide` was single frame. | Admin story sequences added separately. | User-facing flow remains `story-slide`; admin story sequences keep their workflow but inherit the shared content-kit visual rules. |
| Photoshoot path | Not part of June 11 app-v3 formats. | Full photoshoot and hero-anchor cohesion added. | Preserved photoshoot, 6-9 role-tagged shots, hero-first anchor, and identity-first reference flow. |
| Admin content-kit path | Not the main June 11 user path. | Admin Content tab, Carousel Kit, Story Sequences, Shoot Studio added. | Content-kit image redesign prompts and coded tutorial annotations now follow the same neutral SSELFIE house style. |

## Phase Readiness

- Phase 1, baseline lock: this document records the comparison and current acceptance state.
- Phase 2, shared visual rules: `lib/app-v3/maya/visual-rules.ts` is used by Maya persona, app-v3 compiler, and content-kit slide redesign prompts.
- Phase 3, photo intelligence: photo/photoshoot prompts keep identity lock first and retain setting, outfit, hair-from-reference, pose, composition, mood, lighting, realism, and avoid-list structure.
- Phase 4, inspiration handling: generation route distinguishes close recreation for first/hero image from same-world variation for photoshoot set shots.
- Phase 5, carousel repair: `buildCustomerCarouselCreativePlan`, validation, and graphic redesign slide building share effective carousel slides from Creative Plan outputs.
- Phase 6, reel covers: generation now requests the `reel-cover` style-reference category first, with `story-sequence` fallback until live references are seeded.
- Phase 7, story decision: Suite remains single `story-slide`; admin story sequences remain admin-only.
- Phase 8, admin consistency: content-kit redesign and tutorial accent rendering use the neutral SSELFIE rules; admin carousel/story final image prompts inherit those rules.
- Phase 9, Admin View Prompt: final prompts are stored in `ai_images.generated_prompt`, include model/provider/format/reference metadata, and are exposed through an admin-gated endpoint only.
- Phase 10, tests/QA: focused tests cover red-term removal, carousel repair, inspiration routing, photoshoot preservation, prompt metadata, reel-cover category fallback, and admin prompt gating.

## Known Live Data Follow-up

`content_style_references` currently has `photoshoot-carousel`, `story-sequence`, and `tutorial` rows. The code is ready for `reel-cover` rows and falls back safely to `story-sequence` until those approved cover references are seeded.
