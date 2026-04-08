# Commit-Ready Plan — Academy, Grant Access & Bug Fixes

**Date:** 2026-02-25  
**Goal:** Complete remaining tasks, fix bugs, and prepare a clean commit to `main`.

---

## 1. Summary of Current State

### Uncommitted / Modified Files

| File | Change | Status |
|------|--------|--------|
| `app/admin/academy/page.tsx` | Grant Access tab + form | ✅ Ready |
| `app/api/admin/academy/grant-access/route.ts` | New API (untracked) | ✅ Ready |
| `lib/email/templates/shopify-migration-welcome.tsx` | New template (untracked) | ✅ Ready |
| `lib/products.ts` | +editing_masterclass, +branded_by_sselfie | ✅ Ready |
| `components/sselfie/concept-card.tsx` | 3-min polling timeout | ✅ Ready |
| `app/academy/success/page.tsx` | **BUG:** wrong membership link | ✅ Fixed |
| `app/academy/products/[productId]/page.tsx` | **BUG:** wrong product link | ✅ Fixed |
| `playwright-report/index.html` | Deleted | ⚠️ Handle |
| `.DS_Store`, `app/.DS_Store` | Modified | ❌ Do not commit |
| `STRIPE_PRODUCTS_NEEDED.md` | Untracked | ✅ Optional (docs) |

---

## 2. Bugs to Fix

### Bug 1: Success Page — Broken Membership CTA

**File:** `app/academy/success/page.tsx`  
**Line:** 128

**Current:**
```tsx
href="/academy/checkout?product=membership"
```

**Problem:** No `/academy/checkout` page exists. Link 404s.

**Fix:**
```tsx
href="/checkout/membership"
```

**Reason:** Membership checkout lives at `/checkout/membership` (used by emails, landing, etc.).

---

### Bug 2: Product Page — Wrong "Open" Link

**File:** `app/academy/products/[productId]/page.tsx`  
**Line:** 79

**Current:**
```tsx
href={`/public/academy/${productId}/index.html`}
```

**Problem:** In Next.js, `public/` files are served from root. Path should be `/academy/...`, not `/public/academy/...`.

**Fix:**
```tsx
href={`/academy/${productId}/index.html`}
```

**Note:** This assumes product HTML lives at `public/academy/[productId]/index.html`. If files don't exist yet, the link will 404 until content is added. The path fix is still correct.

---

## 3. Files to Exclude from Commit

| Item | Action |
|------|--------|
| `.DS_Store` | `git restore .DS_Store app/.DS_Store` (or leave unstaged) |
| `app/.DS_Store` | Same as above |
| `playwright-report/` | Add to `.gitignore`; do not commit generated reports |

**Add to `.gitignore`** (if not present):
```
# Playwright
/playwright-report/
/test-results/
/blob-report/
```

---

## 4. Optional: STRIPE_PRODUCTS_NEEDED.md

- **Recommendation:** Commit as documentation for Sandra.
- **Location:** Root or `docs/`.
- **Alternative:** Move to `docs/STRIPE_PRODUCTS_NEEDED.md` for consistency.

---

## 5. Pre-Commit Checklist

- [ ] **Bug 1:** Fix success page membership link → `/checkout/membership`
- [ ] **Bug 2:** Fix product page "Open" link → `/academy/${productId}/index.html`
- [ ] **.gitignore:** Add `playwright-report/` (and related) if missing
- [ ] **Restore:** `.DS_Store` and `app/.DS_Store` (or ensure they stay unstaged)
- [ ] **Lint:** Run `pnpm lint` on modified files
- [ ] **Build:** Run `pnpm build` (verify no new errors)
- [ ] **Verify:** Grant Access flow (admin → grant → email) in dev

---

## 6. Suggested Commit Structure

### Option A: Single Commit

```
feat: academy grant access, product links fix, concept polling timeout

- Add Grant Access tab to admin academy (Shopify migration)
- Add /api/admin/academy/grant-access + shopify-migration-welcome email
- Add editing_masterclass + branded_by_sselfie to ACADEMY_PRODUCTS
- Fix success page membership CTA → /checkout/membership
- Fix product page "Open" link → /academy/[id]/index.html
- Add 3-min timeout to concept card generation polling
- Add playwright-report to .gitignore
```

### Option B: Two Commits

**Commit 1 — Bug fixes:**
```
fix: academy success + product page links

- Success page: membership CTA → /checkout/membership (was 404)
- Product page: Open link → /academy/[id]/index.html (was /public/...)
```

**Commit 2 — Features:**
```
feat: academy grant access, new products, concept polling timeout

- Admin Grant Access tab for Shopify migration
- Grant-access API + shopify-migration-welcome email template
- editing_masterclass + branded_by_sselfie in ACADEMY_PRODUCTS
- 3-min timeout on concept card generation polling
- playwright-report in .gitignore
```

---

## 7. Execution Order

1. **Fix the two bugs** (success page, product page)
2. **Update .gitignore** (playwright-report, etc.)
3. **Restore .DS_Store** (or leave unstaged)
4. **Stage only intended files:**
   ```bash
   git add app/admin/academy/page.tsx
   git add app/api/admin/academy/grant-access/
   git add app/academy/success/page.tsx
   git add app/academy/products/[productId]/page.tsx
   git add app/academy/products/[productId]/purchase-button.tsx  # if modified
   git add components/sselfie/concept-card.tsx
   git add lib/products.ts
   git add lib/email/templates/shopify-migration-welcome.tsx
   git add .gitignore
   git add STRIPE_PRODUCTS_NEEDED.md  # optional
   ```
5. **Run lint + build**
6. **Commit** (choose Option A or B)
7. **Push to main**

---

## 8. Post-Commit Notes

- **Stripe:** `editing_masterclass` and `branded_by_sselfie` need Stripe price IDs before they can be sold on the storefront. Grant Access works without them.
- **Storefront:** `/academy` still shows only 4 products (hardcoded). The 2 new products are admin-grant-only for now.
- **Product HTML:** Ensure `public/academy/[productId]/index.html` exists for each product when content is ready.

---

## 9. Rollback Plan

If issues arise after deploy:

```bash
git revert HEAD
git push origin main
```

Or revert specific files:

```bash
git checkout HEAD~1 -- app/academy/success/page.tsx
git checkout HEAD~1 -- app/academy/products/[productId]/page.tsx
# etc.
```

---

**Last updated:** 2026-02-25  
**Author:** Codex (plan only — no edits applied yet)
