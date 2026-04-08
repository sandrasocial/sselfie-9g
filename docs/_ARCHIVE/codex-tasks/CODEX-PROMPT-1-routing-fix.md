# CODEX PROMPT 1 — ProductAccessCard Routing Fix
# SEND THIS FIRST — quick fix, ~30 min build
# Full spec: docs/codex-tasks/codex-fix-product-access-routing.md

---

Hey Codex — quick fix before the bigger product rebuild. Two files, two changes.

Read the full spec at `docs/codex-tasks/codex-fix-product-access-routing.md` then make these changes:

**File 1: `components/sselfie/product-access-card.tsx`**

Replace DEEP_LINKS with:
```ts
const DEEP_LINKS: Record<ProductAccessId, string> = {
  what_to_say: "/academy/products/what_to_say",
  show_up: "/academy/products/show_up",
  get_paid: "/academy/products/get_paid",
  ai_photo_prompts: "/academy/products/ai_photo_prompts",
}
```

**File 2: `components/sselfie/academy-screen.tsx`**

Update PRODUCT_ACCESS_COPY:
```ts
const PRODUCT_ACCESS_COPY = {
  what_to_say:      { subText: "Your caption framework and messaging workbook.", ctaLabel: "Open workbook" },
  show_up:          { subText: "Your 30-day content rhythm and batching workflow.", ctaLabel: "Open workbook" },
  get_paid:         { subText: "Your revenue path map and 90-day execution plan.", ctaLabel: "Open workbook" },
  ai_photo_prompts: { subText: "50 done-for-you prompts across 10 brand scenarios.", ctaLabel: "Open prompts" },
}
```

**Validate:**
```bash
pnpm vitest run tests/academy-journey.test.ts
pnpm eslint components/sselfie/product-access-card.tsx components/sselfie/academy-screen.tsx
pnpm build
```

Do NOT touch: MiniProductCard, ProductAccessId type, /public/academy/ workbooks, or /academy/products/[productId]/page.tsx.
