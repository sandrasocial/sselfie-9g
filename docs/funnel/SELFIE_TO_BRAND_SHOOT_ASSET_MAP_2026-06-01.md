# Selfie To Brand Shoot Asset Map

Date: 2026-06-01
Status: V1 asset consolidation map
Parent plan: `docs/funnel/SELFIE_TO_BRAND_SHOOT_SYSTEM_EXECUTION_PLAN_2026-06-01.md`

## Executive Summary

SSELFIE already has enough assets to package a paid Selfie to Brand Shoot System without building a new platform from scratch.

The strongest consolidation path is:

- Free Prompt Pack captures demand.
- Prompt Vault proves the visual transformation.
- Selfie Guide becomes source-photo quality.
- Starter Kit contributes posing, presets, captions, and selfie polish.
- Masterclass contributes visibility, visual identity, brand energy, content confidence, and content-use lessons.
- Editing Masterclass contributes polishing workflow.
- Studio, Maya, and Feed Planner stay protected for existing users and may become premium/support layers later.

The product should feel like one transformation:

> Start with one selfie. Choose the visual world. Create the AI brand shoot. Pick the images that look like you. Turn them into content.

It should not feel like ten bundled products.

## Asset Inventory

| Asset | Locations | Current value | Primary tag | New role | Notes / risk |
| --- | --- | --- | --- | --- | --- |
| Free Prompt Pack | `/ai-prompts`, `/ai-prompts/access/[token]`, `app/ai-prompts/page.tsx`, `lib/ai-prompts/prompt-data.ts` | Demand capture and free preview of SSELFIE visual worlds | `first_result` | Front-door entry | Must keep bridging to Vault/System, not Starter Kit |
| Prompt Vault | `/prompt-vault`, `/checkout/prompt-vault`, `/access/prompt-vault/[token]`, `/academy/access/prompt-vault`, `lib/ai-prompts/prompt-data.ts` | Full AI photoshoot collections with visuals and copy buttons | `prompting` | Core product engine | Avoid "prompt pack" framing |
| Vault collection metadata/images | `lib/ai-prompts/prompt-data.ts`, Vault access pages | Visual worlds, proof, collection demand | `aesthetic_direction` | Core proof layer | Needs proof/use-case labels by collection |
| Selfie Guide | `/selfie-guide`, `/selfie-guide/access/[token]`, `/academy/access/selfie-guide`, `lib/selfie-guide/*` | Light, angles, confidence, selfie basics, 7-day flow | `source_selfie` | Module 1 support | Reframe as better source photo for better AI output |
| Starter Kit | `/starter-kit`, `/access/starter-kit/[token]`, `/academy/access/starter-kit`, `docs/academy/STARTER_KIT_DELIVERABLE_AUDIT.md` | Posing guide, presets, captions, storytelling PDFs, quick-start | `bonus` | Bonus/support asset | Weak as front-door; keep buyer access intact |
| Starter Kit presets | Vercel Blob URLs in Starter Kit buyer home | Lightroom/DNG visual polish | `editing` | Bonus | Useful after AI result; avoid making presets core promise |
| Starter Kit captions/content PDFs | Starter Kit buyer home/audit docs | Captions and story/content support | `content_usage` | Support asset | Use only where tied to generated images |
| Branded by SSELFIE | `/academy/courses/[courseId]`, `/academy/access/masterclass`, `docs/academy/MASTERCLASS_DELIVERABLE_AUDIT.md` | Personal brand, visual aesthetic, showing up, content pillars | `aesthetic_direction` | Core/support modules | DB-hosted lesson content; 29 declared vs 14 found mismatch |
| Editing Masterclass | Academy lessons and Masterclass access | Editing/video workflow | `editing` | Bonus/support module | Keep short; do not turn core offer into editing course |
| Brand Strategy Pack | `/academy/access/brand-strategy`, `brand_strategy_pack` entitlement | Brand clarity and setup | `aesthetic_direction` | Optional bonus/support | Avoid generic brand strategy positioning |
| Academy buyer homes | `/academy`, `/academy/access/*`, `lib/academy-entitlements.ts` | Existing access and entitlement system | `legacy_only` | Delivery infrastructure | Do not rename IDs casually |
| Studio | `/studio`, `sselfie_studio_membership` | Existing member workspace | `legacy_only` | Protect/member bonus layer | Keep pricing/access; do not sell cold prompt traffic into Studio |
| Maya | `/maya`, `lib/maya/*`, `components/sselfie/*` | AI guidance, generation, member workspace | `legacy_only` | Future premium guided layer | Activation issues; do not rebuild as core product now |
| Feed Planner / Blueprint | `/feed-planner`, `/blueprint`, `paid_blueprint`, `lib/feed-planner/*` | 9-grid/content planning | `content_usage` | Legacy/support asset | Paid users depend on it; planning is not front-door promise |
| Email sequences | `lib/email/templates/*`, `lib/email/*sequence.ts` | Delivery, nurture, recovery | `proof` | Activation and bridge layer | Old sequences may still point to old ladder |
| Morning Board / admin intelligence | `/admin/daily-briefing`, analytics reports | Daily decisions and next fixes | `proof` | Operating layer | Should judge tasks against Selfie to Brand Shoot lock |

## Recommended System Module Map

### Module 1: Start With One Selfie

Purpose:

Help her choose or take the source photo that gives AI the best chance of creating a believable brand shoot.

Existing assets:

- Selfie Guide.
- Starter Kit posing guide.
- Confidence/camera hack lessons from Masterclass.
- Selected selfie basics from older education.

Missing assets:

- One-page "which selfie should I use?" checklist.
- Three example source selfies: good / okay / poor.
- Simple "before you upload" checklist.

### Module 2: Choose Your Visual World

Purpose:

Help her choose the aesthetic that matches the woman/brand she is becoming.

Existing assets:

- Prompt Vault collections.
- Branded by SSELFIE visual aesthetic lessons.
- Brand Glow / CEO Brand Blueprint resources.
- Sandra's collection naming and taste notes.

Missing assets:

- Visual world selector.
- Short descriptions for each aesthetic.
- Use-case labels: profile, reel cover, launch, story, sales page.

### Module 3: Create The AI Brand Shoot

Purpose:

Guide her from prompt copy to first usable output.

Existing assets:

- Prompt Vault copy buttons.
- Free Prompt Pack opening shots.
- AI prompt nurture sequence.
- Prompt Vault delivery and buyer sequence.

Missing assets:

- First-result walkthrough.
- Troubleshooting guide for fake-looking results.
- ChatGPT setup note.
- "Try this first" activation path.

### Module 4: Pick The Images That Look Like You

Purpose:

Help her decide which AI images are usable, believable, and aligned.

Existing assets:

- Sandra's taste notes from Vault collections.
- Editing Masterclass.
- Brand/aesthetic lessons.

Missing assets:

- Image selection rubric.
- "Keep / edit / discard" checklist.
- Examples of too-AI, believable, and premium-looking results.

### Module 5: Turn Them Into Content

Purpose:

Make the images useful for visibility, not just pretty.

Existing assets:

- Masterclass content system lessons.
- Starter Kit caption/content PDFs.
- Feed Planner as optional legacy support.
- CEO Reels Launchpad.
- Selfie to CEO Instagram Planner.

Missing assets:

- "Use this image as..." guide.
- Five content use cases:
  - profile image
  - reel cover
  - story sequence
  - launch/sales post
  - about/website image
- Simple 7-day content plan from one AI brand shoot.

### Module 6: Bonuses

Purpose:

Add value without bloating the core path.

Possible bonuses:

- Presets.
- Editing Masterclass.
- Selected caption packs.
- Visibility checklist.
- Brand Glow worksheets.
- Feed Planner access for eligible buyers only, not as a universal promise unless entitlement is added.

## Required Assets That Already Exist

- Free prompt opt-in and access flow.
- Prompt Vault collections and buyer access.
- Copy tracking for prompt usage.
- Prompt Vault checkout and recovery.
- Selfie Guide.
- Starter Kit buyer home and token access.
- Masterclass Academy buyer home.
- Branded by SSELFIE lessons.
- Editing Masterclass lessons.
- Presets and PDFs in Vercel Blob.
- Existing Academy/access infrastructure.
- Existing Studio/Maya member surfaces.
- Daily Morning Board and growth intelligence surfaces.

## Missing Assets To Create

Highest priority:

1. Selfie to Brand Shoot product outline.
2. Source selfie checklist.
3. Visual world selector.
4. First-result walkthrough.
5. Fake-looking result troubleshooting guide.
6. Image selection rubric.
7. "Turn one shoot into content" guide.
8. Product sales page.
9. Buyer activation emails.
10. Member continuity note.

Do not create yet:

- Full community.
- Full membership archive.
- Drag/drop planner.
- New AI generator.
- New full Academy redesign.

## Legacy Products That Must Keep Working

Do not break:

- Studio membership access.
- Maya access for members.
- Feed Planner/Blueprint access.
- Prompt Vault token access.
- Prompt Vault Academy access.
- Starter Kit token access.
- Starter Kit Academy access.
- Selfie Guide token access.
- Masterclass Academy access.
- Existing Academy entitlements.
- Stripe product/payment/webhook logic.

## Public Promotion Recommendations

Lead with:

- Selfie to Brand Shoot.
- Turn one selfie into elevated personal brand images.
- Create your first AI brand shoot.
- Sandra-tested visual worlds.
- Your content can finally look like the woman you are becoming.

Stop leading with:

- Prompt pack.
- Starter Kit.
- Masterclass.
- Branded by SSELFIE.
- Editing Masterclass.
- Feed Planner.
- Studio/Maya for cold prompt traffic.

## Risks

1. Overbuilding.
   - The highest risk is turning this into another giant portal.

2. Confusing existing buyers.
   - Current customers must keep their access and pricing.

3. Entitlement breakage.
   - Product IDs are wired through checkout, Academy, emails, and access recovery.

4. Old funnel copy.
   - Some existing email/page copy may still point AI traffic toward older products.

5. Too much bundled content.
   - The system must feel like one clear path, not a dump of old assets.

6. Selling prompts instead of transformation.
   - Public copy must lead with the outcome.

## Next Build Task List

### Task 2: Product Outline

Create the Selfie to Brand Shoot System outline from this map.

Output:

- Module titles.
- Lesson names.
- Required existing assets.
- Missing mini-assets.
- Buyer outcome for each module.

### Task 3: Public Copy Alignment

Update Free Prompt Pack and Prompt Vault messaging so both point toward Selfie to Brand Shoot.

Scope:

- Copy only.
- No checkout/payment/access logic changes.

### Task 4: Core Offer Page

Build the lean sales page for Selfie to Brand Shoot System.

Scope:

- Product page only.
- No complex portal.
- Use existing assets and visuals.

### Task 5: Buyer Activation Layer

Create the first-result buyer path:

- Day 0 email.
- Day 1 check-in.
- Day 3 troubleshooting.
- Day 5 content-use prompt.

### Task 6: Member Continuity

Add a member-facing note and/or Studio bonus section:

- Your access stays.
- Your pricing stays.
- New Selfie to Brand Shoot drops are added as bonuses.

### Task 7: Premium Inquiry Path

Add quiet VIP inquiry route for women who want Sandra's direct eye.

Scope:

- Inquiry page/form.
- No full agency build.
