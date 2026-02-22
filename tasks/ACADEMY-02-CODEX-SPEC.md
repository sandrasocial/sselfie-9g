# ACADEMY-02 — Codex Implementation Spec
# Checkout Flow + Webhook + Pages for Academy Mini-Products

## DO NOT TOUCH
- `app/api/webhooks/stripe/route.ts` — extend only, do not refactor
- Any existing checkout, subscription, or credits logic
- `lib/academy-access.ts` — already complete, read-only
- `lib/products.ts` — already complete, read-only

---

## WHAT EXISTS (do not recreate)

```
lib/academy-access.ts          ← userHasAcademyAccess(userId, courseId) 
lib/products.ts                ← ACADEMY_PRODUCTS with all 3 products
lib/stripe.ts                  ← stripe client (import { stripe } from "@/lib/stripe")
lib/db.ts                      ← neon(process.env.DATABASE_URL!) 
lib/resend/manage-contact.ts   ← updateContactTags, addOrUpdateResendContact
lib/email/send-email.ts        ← sendEmail(to, subject, html)
```

DB tables already exist:
```sql
academy_course_purchases (id, user_id, course_id, stripe_session_id, stripe_payment_intent_id, amount_paid, currency, status, created_at)
user_tags (user_id, tag, created_at)  -- has unique constraint on (user_id, tag)
```

Stripe price IDs in .env.local:
```
STRIPE_PRICE_WHAT_TO_SAY=price_1T2xljEVJvME7vkwFcaN1GEw
STRIPE_PRICE_SHOW_UP=price_1T2xllEVJvME7vkwHC3r6GAI
STRIPE_PRICE_GET_PAID=price_1T2xlmEVJvME7vkwkbgotHoB
```

---

## BUILD THESE 4 THINGS

---

### 1. Checkout API — `app/api/academy/checkout/route.ts`

```typescript
// POST /api/academy/checkout
// Body: { productId: "what_to_say" | "show_up" | "get_paid" }
// Auth: required (use createServerClient from @/lib/supabase/server)
// Returns: { url: string } — the Stripe hosted checkout URL
```

Pattern to follow: look at how `app/api/checkout-session/route.ts` uses `stripe.checkout.sessions.retrieve` — use the same `stripe` import.

Implementation:
- Validate `productId` is one of the 3 valid keys
- Get authenticated user via Supabase (`createServerClient` → `getUser`)
- If not authenticated, return 401
- Look up `ACADEMY_PRODUCTS[productId]` for `stripePriceId` and `tag`
- Create Stripe Checkout Session:
  ```typescript
  stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/academy/success?product=${productId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/academy`,
    metadata: {
      product_type: "academy_purchase",
      academy_product_id: productId,
      user_id: user.id,
    },
    customer_email: user.email ?? undefined,
  })
  ```
- Return `{ url: session.url }`

---

### 2. Webhook Extension — add to `app/api/webhooks/stripe/route.ts`

**DO NOT refactor the file. ADD a handler inside the existing `checkout.session.completed` case.**

Inside the existing `case "checkout.session.completed":` block, find where `productType` is read from metadata:
```typescript
const productType = session.metadata.product_type
```

Add a new branch for academy purchases (before or after existing product type handling):
```typescript
if (productType === "academy_purchase") {
  // Handle academy purchase
  const academyProductId = session.metadata.academy_product_id
  const userId = session.metadata.user_id
  // ... implementation below
}
```

Implementation inside that branch:
1. Validate `academyProductId` and `userId` exist in metadata
2. Insert into `academy_course_purchases`:
   ```sql
   INSERT INTO academy_course_purchases 
     (user_id, course_id, stripe_session_id, stripe_payment_intent_id, amount_paid, currency, status)
   VALUES
     (userId, academyProductId, session.id, session.payment_intent, session.amount_total, session.currency, 'active')
   ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
   ```
   Note: if there's no unique constraint on (user_id, course_id), skip the ON CONFLICT clause.

3. Add user tag (use INSERT ... ON CONFLICT DO NOTHING):
   ```sql
   INSERT INTO user_tags (user_id, tag) VALUES (userId, product.tag)
   ON CONFLICT (user_id, tag) DO NOTHING
   ```
   Get `product.tag` from `ACADEMY_PRODUCTS[academyProductId].tag`

4. Send post-purchase email via Resend (see email template below)

5. Log success, do not throw — academy failures should not break other webhook processing

Use `const sql = neon(process.env.DATABASE_URL!)` — already defined at top of file.
Import `ACADEMY_PRODUCTS` from `@/lib/products`.

---

### 3. Post-Purchase Email — `lib/email/templates/academy-purchase-email.ts`

```typescript
export function generateAcademyPurchaseEmail(params: {
  productName: string
  productTagline: string  
  upsellProductName: string | null
  upsellProductPrice: number | null  // in cents, e.g. 2700
  upsellProductId: string | null
  appUrl: string
}): { subject: string; html: string }
```

Subject: `You're in, [productName] 🖤`

HTML email (inline styles only, no external CSS):
- Clean, minimal. White background, #0a0a0a text, max-width 600px, 48px padding.
- Font: Georgia for headings, Arial for body, font-weight 300.
- Heading: "You're in. Let's go."
- Body: Warm, personal. "What To Say is yours. You just made a decision most people talk about but never take. That matters."
- Clear access link button: `${appUrl}/academy/${productId}` — black button, white text, 12px uppercase tracking.
- If upsellProductName is not null, add a section: "Ready for the next step?" with upsell product name, price formatted as "€XX", link to `${appUrl}/academy/${upsellProductId}`.
- Footer: unsubscribe link placeholder `{{unsubscribe_url}}`.

Adapt copy for each product (what_to_say / show_up / get_paid) using the productName and tagline params.

---

### 4. Pages

#### `app/academy/page.tsx` — Academy Landing Page

Simple page listing all 3 products. For each product in `Object.values(ACADEMY_PRODUCTS)`:
- Product name (Cormorant Garamond or Georgia, light weight, uppercase)
- Tagline
- Description  
- Price (format cents: `€${(product.price / 100).toFixed(0)}`)
- "Get Access" button → calls `POST /api/academy/checkout` with productId, then `window.location.href = data.url`

Auth check: if user not logged in, redirect to `/login` before checkout.

Design: white background, #0a0a0a text, clean grid. Mobile-first (375px min). No Tailwind components that might not exist — use only core Tailwind utilities.

#### `app/academy/success/page.tsx` — Success Page

Reads `?product=` and `?session_id=` from URL params.

Shows:
- "You're in 🖤" heading
- Product name and what they now have access to
- CTA button: "Access [Product Name]" → `/academy/[productId]`
- If product has `upsellTo`, show upsell section: next product name, price, "Get [upsellProductName] →" button

No Stripe API call needed on success page — just use the URL params for display.

#### `app/academy/[productId]/page.tsx` — Product Access Page (stub)

Simple stub for now:
- Check auth (redirect to `/login` if not logged in)
- Check `userHasAcademyAccess(userId, productId)`
- If no access: show "Get Access" button linking back to `/academy`
- If has access: show "You have access to [Product Name]. Content coming soon."

This stub prevents 404s. Content will be added later.

---

## TYPESCRIPT RULES

- No `any` unless absolutely unavoidable (cast as `unknown` first if needed)
- All new files must pass `tsc --noEmit --skipLibCheck` with zero NEW errors
- Pre-existing errors in other files are fine to ignore
- Use `import type` for type-only imports

---

## WHEN DONE

1. Run: `pnpm exec tsc --noEmit --skipLibCheck 2>&1 | grep "academy\|Academy"` — fix any errors shown
2. Run: `git add app/academy/ app/api/academy/ lib/email/templates/academy-purchase-email.ts`
3. Run: `git diff --staged --stat` — confirm only academy files staged
4. Run: `git commit -m "feat: ACADEMY-02 checkout + webhook + pages for mini products"`

Do NOT push. Sandra will verify and push manually.
