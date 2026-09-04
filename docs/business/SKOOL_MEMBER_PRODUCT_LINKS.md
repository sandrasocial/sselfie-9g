# SSELFIE Skool — member product links

Every link below opens a product **free** for anyone with an active Skool
membership. Generated from the live `academy_products` registry and verified
against production on 2026-09-04: all 19 return a valid gated route, none 404.

## How these work

Each link goes to `sselfie.ai/academy/access/<product>`, which checks the Skool
entitlement and forwards to the real product. Members must be **signed in to
SSELFIE with the same email they used on Skool** — that is the account the setup
email creates. Signed out, the link sends them to log in and then continues to the
product, so every link is safe to post as-is.

Nothing here is a purchase page. A member never sees a checkout.

---

## Courses and systems

| Product | Link |
|---|---|
| Branded by SSELFIE | https://www.sselfie.ai/academy/access/branded-by-sselfie |
| Editing Masterclass | https://www.sselfie.ai/academy/access/editing-masterclass |
| Selfie Masterclass | https://www.sselfie.ai/academy/access/masterclass |
| Selfie to Brand Shoot System | https://www.sselfie.ai/academy/access/selfie-to-brand-shoot |
| Visibility To Paid Suite | https://www.sselfie.ai/academy/access/visibility-suite |

## Workbooks

| Product | Link |
|---|---|
| What To Say | https://www.sselfie.ai/academy/access/what-to-say |
| Show Up | https://www.sselfie.ai/academy/access/show-up |
| Get Paid | https://www.sselfie.ai/academy/access/get-paid |
| Brand Strategy Pack | https://www.sselfie.ai/academy/access/brand-strategy |

## Prompts, presets and packs

| Product | Link |
|---|---|
| Prompt Vault | https://www.sselfie.ai/academy/access/prompt-vault |
| SSELFIE Presets · Full Collection | https://www.sselfie.ai/academy/access/presets |
| Selfie To AI Photos Kit | https://www.sselfie.ai/academy/access/selfie-to-ai-photos-kit |
| AI Photo Prompt Pack | https://www.sselfie.ai/academy/access/ai-photo-prompts |
| AI Photo Refresh | https://www.sselfie.ai/academy/access/ai-photo-refresh |
| Concept Cards | https://www.sselfie.ai/academy/access/concept-cards |
| Caption Sprint | https://www.sselfie.ai/academy/access/captions |
| Feed Reset | https://www.sselfie.ai/academy/access/feed-reset |
| Starter Kit | https://www.sselfie.ai/academy/access/starter-kit |
| Selfie Guide | https://www.sselfie.ai/academy/access/selfie-guide |

## Maya and Vault Maya

| What | Link |
|---|---|
| Vault Maya | https://www.sselfie.ai/vault-maya/studio |
| Maya + 100 credits every month | https://www.sselfie.ai/app |

Vault Maya is gated by `getSuiteAccess`, which reads the Skool entitlement
directly — members reach it with no purchase and no separate unlock. Link straight
to `/vault-maya/studio`, **not** `/vault-maya`, which is the sales page.

---

## Still paid, deliberately

**Your Next Campaign** (€97) is done-for-you work, not a download: an intake form,
an `awaiting_intake -> delivered` order lifecycle, and a queue in `/admin/campaigns`,
with nothing that delivers it automatically. Making it free would put unbounded
fulfilment work in that queue. It stays a paid upsell unless you decide otherwise.

Legacy products (One-Time Session, Feed Planner Access) and the Maya Essential
pilot tier are excluded too — the first two are retired, and the third is a
*cheaper* membership than Skool.
