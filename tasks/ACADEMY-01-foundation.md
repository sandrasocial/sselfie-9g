# ACADEMY-01: Mini Products Foundation

**Priority:** HIGH — nothing else in the Academy funnel can be built until this is done  
**Source:** `docs/codex-tasks/ACADEMY-MINI-PRODUCTS-AUDIT.md` + `docs/codex-tasks/ACADEMY-PRODUCT-STRATEGY.md`  
**Follows:** UX-02 (done ✅)  
**Do NOT skip ahead** — A-02, A-03, A-04 all depend on this

---

## Context

SSELFIE Academy is being transformed into a multi-product revenue engine using the Maria Wendt model:

- €17 — "What To Say" (ManyChat keyword: SAY)
- €27 — "Show Up" (ManyChat keyword: CONTENT)
- €47 — "Get Paid" (ManyChat keyword: PAID)
- €97/mo — Studio Membership (existing)
- €2,497 / €4,997 — Brand Engine (existing)

Right now Academy has NO per-product access control and NO purchase tracking. It's all-or-nothing (membership only). This task builds the database foundation that makes individual product purchases possible.

Read the full strategy before starting: `docs/codex-tasks/ACADEMY-PRODUCT-STRATEGY.md`

---

## Task A-01 — Database Tables

Create 3 new tables via Supabase migration. Use the existing migration pattern in `supabase/migrations/`.

### Table 1: `academy_course_purchases`
```sql
create table academy_course_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  stripe_payment_intent_id text unique,
  amount_paid integer not null, -- in cents (€17 = 1700)
  currency text not null default 'eur',
  purchased_at timestamptz not null default now(),
  status text not null default 'active' -- active | refunded
);
create index on academy_course_purchases(user_id);
create index on academy_course_purchases(course_id);
```

### Table 2: `academy_resource_purchases`
```sql
create table academy_resource_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null, -- 'template_pack' | 'monthly_drop' | 'flatlay'
  resource_id text not null,
  stripe_payment_intent_id text unique,
  amount_paid integer not null,
  currency text not null default 'eur',
  purchased_at timestamptz not null default now(),
  status text not null default 'active'
);
create index on academy_resource_purchases(user_id);
```

### Table 3: `user_tags`
```sql
create table user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  tagged_at timestamptz not null default now(),
  source text, -- 'stripe_webhook' | 'manual' | 'api'
  metadata jsonb
);
create unique index on user_tags(user_id, tag); -- no duplicate tags per user
create index on user_tags(user_id);
create index on user_tags(tag);
```

**After creating migrations:** run `supabase db push` or confirm the migration applies cleanly. Do NOT modify any existing tables.

---

## Task A-02 — Access Control Helper

Create `lib/academy-access.ts` with a function that checks whether a user can access a given course. Membership holders get everything. Individual buyers get only what they purchased.

```ts
// lib/academy-access.ts

import { createClient } from '@/lib/supabase/server'

export type CourseId =
  | 'what_to_say'    // €17 product
  | 'show_up'        // €27 product
  | 'get_paid'       // €47 product

export async function userHasAcademyAccess(
  userId: string,
  courseId: CourseId
): Promise<boolean> {
  const supabase = createClient()

  // 1. Check if active Studio Member (gets everything)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (subscription) return true

  // 2. Check if individually purchased this course
  const { data: purchase } = await supabase
    .from('academy_course_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle()

  return !!purchase
}
```

**Note:** Check the actual subscriptions table name — it may be `user_subscriptions` or similar. Look at existing membership checks in the codebase (search for `subscription` in `lib/` or `app/api/`) and use the same pattern.

---

## Task A-03 — Add Mini Products to lib/products.ts

Open `lib/products.ts` (or wherever products are defined — search for existing Stripe price IDs). Add the 3 new mini-products.

```ts
// Add to existing products config:

export const ACADEMY_PRODUCTS = {
  what_to_say: {
    id: 'what_to_say',
    name: 'What To Say',
    tagline: 'Find Your Message In One Hour',
    price: 1700, // cents
    currency: 'eur',
    stripePriceId: process.env.STRIPE_PRICE_WHAT_TO_SAY!, // add to .env.local
    manychatKeyword: 'SAY',
    tag: 'bought_what_to_say',
    upsellTo: 'show_up',
    description: 'Stop staring at a blank screen. Know exactly what to post — starting today.',
  },
  show_up: {
    id: 'show_up',
    name: 'Show Up',
    tagline: '30 Days of Content That Gets You Noticed',
    price: 2700,
    currency: 'eur',
    stripePriceId: process.env.STRIPE_PRICE_SHOW_UP!,
    manychatKeyword: 'CONTENT',
    tag: 'bought_show_up',
    upsellTo: 'get_paid',
    description: 'Have your entire month of content planned, written, and ready — by Sunday.',
  },
  get_paid: {
    id: 'get_paid',
    name: 'Get Paid',
    tagline: 'Turn Your Visibility Into Your First €500 Online',
    price: 4700,
    currency: 'eur',
    stripePriceId: process.env.STRIPE_PRICE_GET_PAID!,
    manychatKeyword: 'PAID',
    tag: 'bought_get_paid',
    upsellTo: 'membership', // after this → membership pitch
    description: "You're showing up. Now let's make sure the right people notice — and pay you.",
  },
} as const

export type AcademyProductId = keyof typeof ACADEMY_PRODUCTS
```

**Then add to `.env.local`:**
```
STRIPE_PRICE_WHAT_TO_SAY=price_xxxx  # create in Stripe dashboard, €17 one-time
STRIPE_PRICE_SHOW_UP=price_xxxx      # €27 one-time
STRIPE_PRICE_GET_PAID=price_xxxx     # €47 one-time
```

**Note:** Create the 3 Stripe products/prices in the Stripe dashboard first. Use test mode prices for now. Sandra will swap to live prices before launch. Add the test price IDs to `.env.local` and to Vercel env vars.

---

## What NOT to touch

- Do NOT modify any existing Academy UI yet — that's A-06
- Do NOT build checkout flow yet — that's A-04
- Do NOT build Stripe webhook yet — that's A-10
- Do NOT touch Maya components, Feed Planner, or email code

---

## Validation checklist

- [ ] `supabase migration list` shows 3 new migrations applied cleanly
- [ ] `academy_course_purchases`, `academy_resource_purchases`, `user_tags` tables exist in DB
- [ ] `lib/academy-access.ts` exists and TypeScript compiles with no errors
- [ ] `lib/products.ts` exports `ACADEMY_PRODUCTS` with 3 products
- [ ] 3 Stripe test prices created and IDs added to `.env.local`
- [ ] `pnpm exec tsc --noEmit` passes (no type errors)
- [ ] `pnpm dev smoke` passes
- [ ] STATUS.md updated with ACADEMY-01 done, files changed, Stripe test price IDs noted

---

## State Summary (for STATUS.md)

After completing, update STATUS.md:
- ACADEMY-01 status: DONE
- Tables created: academy_course_purchases, academy_resource_purchases, user_tags
- New files: lib/academy-access.ts (modified: lib/products.ts)
- Stripe test prices: note the 3 price IDs
- Next task: ACADEMY-02 (checkout flow + Stripe webhook)
