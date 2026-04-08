# Maya Page Renderer V2 Spec

## Goal
Ship a deterministic, on-brand landing page renderer for Maya-generated pages while keeping chat-first orchestration and current routes stable.

## Locked Authority Sources
1. `/Users/MD760HA/sselfie-9g/docs/SSELFIE-DESIGN-VOICE-MASTER-GUIDE.md`
2. `/Users/MD760HA/sselfie-9g/docs/brand/VOICE_BIBLE.md`
3. `/Users/MD760HA/sselfie-9g/docs/brand/DO_DONT.md`

## Non-Negotiables
1. Typography: `Cormorant Garamond` (headers), `Inter` (body/labels only).
2. Colors: use locked SSELFIE palette tokens only (`#0a0a0a`, `#ffffff`, `#f5f5f5`, `#666666`, `#e5e5e5`) plus alpha variants.
3. Copy style: short, direct, human. No corporate buzzwords and no banned phrases.
4. No markdown/control-token artifacts can appear in rendered output.
5. One primary CTA path per page.

## V2 Pipeline
`resolveInput -> composeBlueprint -> renderHtml`

### Resolve Input
- Read snapshot from Maya memory/profile/brand context.
- Resolve: offer, audience, transformation, style, proof points, CTA hint.
- Return missing critical fields: `offer`, `audience`, `transformation`.

### Compose Blueprint
- Generate structured object only:
  - `hook`
  - `truth`
  - `proofBullets[]` (max 3)
  - `ctaLabel`
  - `ctaHref`
  - `heroImageUrl`
  - `supportImageUrls[]` (max 2)
  - `brandTone`
- Validate against voice and formatting constraints.

### Render HTML
- Deterministic renderer (no free-form generated HTML).
- Asymmetric hero, concise proof block, single CTA strip, mobile safe at 375px.
- Persist blueprint in `page_jsonb` for deterministic regeneration.

## North Product Guidance Reconciliation
North layout guidance can inform structure and hierarchy only. If any suggestion conflicts with locked SSELFIE tokens/fonts/voice, SSELFIE guide wins.

## Rollout
- Gate with `FEATURE_MAYA_PAGE_RENDERER_V2`.
- Dev enabled first.
- Keep fallback path active for one release cycle.
