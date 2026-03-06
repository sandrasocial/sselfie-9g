# User Journey (Canonical)

## Stage 1: Acquisition
- Entry: `/`
- User intent: understand offer and value quickly
- Primary actions: view pricing, start checkout, sign up
- Core events: `landing_view`, `pricing_view`, `checkout_start`
- Success metric: checkout initiation rate

## Stage 2: Lead capture
- Entry: `/freebie/brand-strategy`
- User intent: get immediate brand strategy value
- Primary actions: submit form, receive strategy token
- Data model: `freebie_brand_strategies`
- Success metric: submit-to-strategy completion rate

## Stage 3: Freebie delivery + upsell
- Entry: `/strategy/[token]`
- User intent: consume strategy and decide next step
- Primary actions: go to auth/checkout path
- Success metric: strategy-to-signup or strategy-to-checkout conversion

## Stage 4: Auth
- Entry: `/auth/login`, `/auth/sign-up`, `/auth/callback`
- User intent: create account or sign in and continue intent
- Primary actions: authenticate, resume return path, land in app shell
- Success metric: auth completion rate

## Stage 5: Checkout
- Entry: `/checkout/*`, embedded `/checkout`
- User intent: complete purchase without friction
- Primary actions: checkout submit, success confirmation
- Core events: `checkout_start`, `purchase`
- Success metric: checkout completion rate

## Stage 6: Activation
- Entry: `/studio` (canonical shell)
- User intent: generate first meaningful output fast
- Primary actions: onboarding completion, first generation, quick-start feed
- Core events:
- `studio_opened`
- `activation_jumpstart_opened`
- `activation_continue_clicked`
- `activation_selfie_uploaded`
- `first_image_generated`
- `maya_capabilities_opened`
- `maya_tool_invoked`
- Success metric: signup-to-first-output time and rate

## Stage 7: Publish + Monetize
- Entry: chat-created assets + public pages `/p/[username]/[slug]`
- User intent: publish quickly and convert viewers into members
- Primary actions: create draft asset in chat, publish personal page, capture lead, route to checkout
- Data model: `personal_pages`, `personal_page_leads`, `maya_produced_assets`
- Core events:
- `maya_asset_draft_created`
- `maya_asset_draft_updated`
- `maya_public_page_view`
- `maya_public_page_lead_captured`
- `maya_public_page_checkout_clicked`
- Success metric: asset-to-lead conversion and lead-to-membership checkout rate

## Maya-first target state
- Keep routing as compatibility scaffolding.
- Move user actions into chat-native tools (inline cards, upload zones, previews, buttons).
- Treat tabs as temporary Phase B shell; converge to one conversation canvas.
