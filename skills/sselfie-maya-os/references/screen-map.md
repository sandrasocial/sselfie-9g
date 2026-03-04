# Screen Map (Current + Direction)

## Public funnel screens

### `/`
- Purpose: acquisition and pricing entry.
- Owner: `app/page.tsx`, `components/sselfie/landing-page-new.tsx`.
- Key behavior: show Studio CTA and optional paid blueprint CTA via feature flag API.

### `/freebie/brand-strategy`
- Purpose: lead capture for strategy freebie.
- Owner: `app/freebie/brand-strategy/page.tsx` + `app/api/freebie/brand-strategy/route.ts`.
- Key behavior: create strategy token and route to `/strategy/[token]`.

### `/strategy/[token]`
- Purpose: deliver freebie output and upsell.
- Owner: `app/strategy/[token]/page.tsx`.
- Key behavior: map toward auth and/or checkout intents.

### `/p/[username]/[slug]`
- Purpose: public delivery surface for Maya-generated landing assets.
- Owner: `app/p/[username]/[slug]/route.ts`.
- Key behavior: capture lead (`/api/maya/public/lead`) and route to Studio checkout.

### `/auth/login`, `/auth/sign-up`, `/auth/callback`
- Purpose: identity and continuity.
- Key behavior: preserve return intent and enter canonical shell.

### `/checkout/*`, `/checkout`, `/checkout/success`, `/checkout-upgrade`
- Purpose: complete payment and continue in-app.
- Key behavior: post-success route should land in real app surface (`/studio`).

## In-app screens

### `/studio` (canonical)
- Purpose: primary authenticated shell.
- Owner: `app/studio/page.tsx`, `components/sselfie/sselfie-app.tsx`.
- Key behavior: activation state, Maya surface, capability discovery card, tab shell (temporary scaffolding).

### `/maya`
- Purpose: direct Maya entry that mounts same app shell.
- Direction: converge behavior into `/studio` canonical usage.

### `/feed-planner`
- Purpose: feed planning and quick-start activation path.
- Owner: `app/feed-planner/page.tsx` + feed components/routes.
- Key behavior: preserve onboarding + quick-start conversion instrumentation.

### `/gallery`, `/academy`, `/account` (tab surfaces)
- Purpose: accessed through shell tabs.
- Direction: progressively expose through Maya tool calls instead of separate navigation burden.

## Legacy compatibility routes

### `/blueprint/paid`
- Status: compatibility redirect shim to `/feed-planner`.
- Rule: do not reintroduce feature logic here.

### `/paid-blueprint`
- Status: paid product landing.
- Rule: keep route explicit if still sold, but avoid duplicate in-app destinations.

## Screen-level decision rule
- If action can be completed in-context in Maya chat, prefer inline component/tool rendering.
- If full-page UI is still needed, treat it as transitional and document migration path back to Maya canvas.
