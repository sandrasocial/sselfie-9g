# SSELFIE Skool — member product links

Every link below opens a product **free** for anyone with an active Skool
membership. Generated from the live `academy_products` registry and checked
against production on 2026-09-04.

## How these work

Each link goes to `sselfie.ai/academy/access/<product>`, which checks the Skool
entitlement and then forwards to the real product. Members must be **signed in to
SSELFIE with the same email they used on Skool** — that is the account the setup
email creates. Signed out, the link sends them to log in first and then continues
to the product, so it is safe to post as-is.

Nothing here is a purchase page. A member never sees a checkout.

---

## Ready to post now

| Product | Link |
|---|---|
| Visibility To Paid Suite | https://www.sselfie.ai/academy/access/visibility-suite |
| What To Say | https://www.sselfie.ai/academy/access/what-to-say |
| Show Up | https://www.sselfie.ai/academy/access/show-up |
| Get Paid | https://www.sselfie.ai/academy/access/get-paid |
| Concept Cards | https://www.sselfie.ai/academy/access/concept-cards |
| Caption Sprint | https://www.sselfie.ai/academy/access/captions |
| Feed Reset | https://www.sselfie.ai/academy/access/feed-reset |
| AI Photo Refresh | https://www.sselfie.ai/academy/access/ai-photo-refresh |
| Prompt Vault | https://www.sselfie.ai/academy/access/prompt-vault |
| Selfie to Brand Shoot System | https://www.sselfie.ai/academy/access/selfie-to-brand-shoot |
| Starter Kit | https://www.sselfie.ai/academy/access/starter-kit |
| Selfie Masterclass | https://www.sselfie.ai/academy/access/masterclass |
| Selfie Guide | https://www.sselfie.ai/academy/access/selfie-guide |
| Brand Strategy Pack | https://www.sselfie.ai/academy/access/brand-strategy |

Plus, included with membership and reached inside the app rather than by link:

- **Maya + 100 credits every month** — https://www.sselfie.ai/app
- **Vault Maya** — included; opens inside the app

## Live after PR #136 deploys

These two work the moment that merge lands. Do not post them before.

| Product | Link |
|---|---|
| Selfie To AI Photos Kit | https://www.sselfie.ai/academy/access/selfie-to-ai-photos-kit |
| SSELFIE Presets · Full Collection | https://www.sselfie.ai/academy/access/presets |

## Do not post yet — no working page

These three are marked included, but no access route exists for them in any
spelling: they are absent from `VISIBILITY_MINI_PRODUCT_BY_SLUG`, so
`/academy/access/<id>` returns 404. Anyone who owns them, Skool or Stripe, has
nowhere to land.

- AI Photo Prompt Pack (`ai_photo_prompts`)
- Editing Masterclass (`editing_masterclass`)
- Branded by SSELFIE (`branded_by_sselfie`)

Fixing them is a content decision — either give each a real access page, or point
its `access_target` at a page that already holds the material.

## Still paid, deliberately

**Your Next Campaign** (€97) is done-for-you work, not a download: it has an
intake form, an `awaiting_intake -> delivered` order lifecycle, and a queue in
`/admin/campaigns`. Nothing delivers it automatically. Making it free would put
unbounded fulfilment work in that queue, so it stays a paid upsell unless you
decide otherwise.

Legacy products (One-Time Session, Feed Planner Access) and the Maya Essential
pilot tier are also excluded — the first two are retired, and the third is a
*cheaper* membership than Skool.
