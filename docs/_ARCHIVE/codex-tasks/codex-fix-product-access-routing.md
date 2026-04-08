# Codex Spec: Fix ProductAccessCard Routing
# Priority: HIGH
# File: components/sselfie/product-access-card.tsx

---

## Problem

The `ProductAccessCard` component (shown in the in-app Academy tab for products the user owns) currently deep-links to generic app tabs:

```ts
const DEEP_LINKS: Record<ProductAccessId, string> = {
  what_to_say: "/studio?tab=feed-planner&product=what_to_say",
  show_up: "/studio?tab=maya&product=show_up",
  get_paid: "/studio?tab=account&product=get_paid",
  ai_photo_prompts: "/studio?tab=maya&product=ai_photo_prompts#maya/prompts",
}
```

This is wrong. When a user clicks a product they own, they expect to open the product — not be dropped into a generic tab. The actual product content (interactive HTML workbooks) lives at:

- `/academy/what_to_say/index.html`
- `/academy/show_up/index.html`
- `/academy/get_paid/index.html`
- `/academy/ai_photo_prompts/index.html`

The correct routing already exists on the server-rendered product page (`/academy/products/[productId]/page.tsx`) which correctly links to `/academy/${productId}/index.html` for users with access. The in-app card just needs to match.

---

## Fix

### Step 1 — Update `DEEP_LINKS` in `product-access-card.tsx`

Replace the current deep links with routes to the product pages:

```ts
const DEEP_LINKS: Record<ProductAccessId, string> = {
  what_to_say: "/academy/products/what_to_say",
  show_up: "/academy/products/show_up",
  get_paid: "/academy/products/get_paid",
  ai_photo_prompts: "/academy/products/ai_photo_prompts",
}
```

The `/academy/products/[id]` page already handles access checking and shows the "Open [Product Name] →" button linking to the HTML workbook. No new pages needed.

### Step 2 — Update CTA copy on the cards

The current `ctaLabel` values in `academy-screen.tsx` reference app features ("Start in Feed Planner", "Chat with Maya", "View in Profile"). Update them to reflect opening the product:

In `PRODUCT_ACCESS_COPY` inside `components/sselfie/academy-screen.tsx`, update `ctaLabel` values:

```ts
const PRODUCT_ACCESS_COPY = {
  what_to_say: {
    subText: "Your caption framework and messaging workbook.",
    ctaLabel: "Open workbook",
  },
  show_up: {
    subText: "Your 30-day content rhythm and batching workflow.",
    ctaLabel: "Open workbook",
  },
  get_paid: {
    subText: "Your revenue path map and 90-day execution plan.",
    ctaLabel: "Open workbook",
  },
  ai_photo_prompts: {
    subText: "50 done-for-you prompts across 10 brand scenarios.",
    ctaLabel: "Open prompts",
  },
}
```

### Step 3 — Update navigation in `product-access-card.tsx`

The card currently uses `router.push(href)` (Next.js client-side navigation). The product pages are server-rendered. This is fine — `router.push` works for internal routes. No change needed here.

---

## What NOT to change

- Do NOT remove or modify the `INCLUDED_BY_PRODUCT` data in `app/academy/products/[productId]/page.tsx`
- Do NOT change the HTML workbook files in `/public/academy/`
- Do NOT change the `MiniProductCard` component (used for unowned products — routing there is already correct)
- Do NOT change the `ProductAccessId` type

---

## Validation

```bash
pnpm vitest run tests/academy-journey.test.ts
pnpm eslint components/sselfie/product-access-card.tsx components/sselfie/academy-screen.tsx
pnpm build
```

After build, manually verify:
1. In-app Academy tab → "You Have Access" card for `what_to_say` → click → lands on `/academy/products/what_to_say` → "Open What To Say →" button visible
2. Same check for `show_up`, `get_paid`, `ai_photo_prompts`

---

## Files touched

- `components/sselfie/product-access-card.tsx` — update `DEEP_LINKS`
- `components/sselfie/academy-screen.tsx` — update `PRODUCT_ACCESS_COPY` ctaLabel + subText values
