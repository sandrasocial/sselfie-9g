# Landing Page Redesign - Implementation Plan

## 📊 Current vs New Design Analysis

### Quick Comparison Table

| Feature | Current Design | New Design | Action Required |
|--------|---------------|------------|-----------------|
| **Navigation** | Full nav (Features, Pricing, Login, CTA) | Minimal (Brand, Login) | Simplify nav |
| **Hero** | "Built from Selfies" + parallax | "Photos that actually look like you" + snap scroll | Rewrite hero |
| **Scroll Type** | Smooth scroll | Snap scroll (scroll-snap) | Implement snap scroll |
| **Sections** | 13 sections | 7 scenes | Consolidate content |
| **Pricing Display** | 3 tiers ($49, $79, $149) | 1 tier ($29 shown, but $79 actual) | ⚠️ Verify price |
| **Checkout Flow** | Embedded checkout | Link to `/checkout/membership` | Use existing route |
| **One-Time Option** | $49 photoshoot card | Link to "One-Time Packs" | ⚠️ Route doesn't exist |
| **Blueprint CTA** | ❌ Not present | ✅ Required | Add to Academy section |
| **BETA Mentions** | Present in pipeline showcase | ❌ Must remove | Remove from code |
| **Testimonials** | Full testimonial grid | ❌ Not in design | ⚠️ Confirm removal |
| **Story Section** | Sandra's story with image | ❌ Not in design | ⚠️ Confirm removal |
| **Mobile Menu** | Hamburger menu | ❌ Not in design | ⚠️ Confirm removal |
| **Navigation Dots** | ❌ Not present | ✅ Required (7 dots) | Create component |
| **Analytics** | Full tracking | Must preserve | Map to new CTAs |
| **Footer** | Full footer with links | Simplified FAQ footer | Simplify footer |

### Current Landing Page Structure
1. **Navigation Bar** (Fixed)
   - SSELFIE brand logo
   - Features, Pricing, Login links
   - GET STARTED CTA button
   - Mobile hamburger menu
   - Analytics tracking on all CTAs

2. **Hero Section**
   - Parallax background image
   - "Built from Selfies. Built from Nothing." headline
   - "SEE HOW IT WORKS" CTA button
   - Analytics: `trackCTAClick("hero", "SEE HOW IT WORKS", "#features")`

3. **What You Actually Get** (4 feature cards)
   - Never Run Out of Content
   - Look Professional Without the Price Tag
   - Know Exactly What to Post
   - Learn While You Create

4. **Transformational Quote Section**
   - Testimonial quote from Shannon

5. **The Story Section** (Sandra's story)
   - Founder image
   - "Built from Nothing. Built from Selfies." story
   - Parallax scroll effect

6. **Interactive Pipeline Showcase** (Lazy loaded)
   - Shows how the AI works
   - Contains BETA mention: "Join the beta and get 50% off for life" ❌

7. **Who This Is For** (3-column grid)
   - Personal brand builders
   - Coaches/consultants
   - Tired of stock photos

8. **Not Just Another AI Headshot Tool** (Comparison)
   - Generic AI vs SSELFIE Studio

9. **Client Results** (Testimonials)
   - TestimonialGrid component (lazy loaded)

10. **Features Section** (`#features`)
    - InteractiveFeaturesShowcase (lazy loaded)

11. **Pricing Section** (`#pricing`)
    - 3 pricing tiers:
      - Instagram Photoshoot ($49 one-time)
      - Content Creator Studio ($79/month) - MOST POPULAR
      - Brand Studio ($149/month)
    - Checkout logic: `handleStartCheckout(tierId)`
    - Analytics: `trackPricingView()`, `trackCheckoutStart()`, `trackCTAClick()`
    - Loading states per tier
    - Uses `startEmbeddedCheckout()` → redirects to `/checkout?client_secret=...`

12. **Footer**
    - Links: Privacy, Terms, Sign Up
    - Contact: email, Instagram, TikTok
    - Social tracking: `trackSocialClick()`

13. **Sticky Footer** (appears after scroll > 800px)
    - "Join SSELFIE" CTA
    - Scrolls to pricing

### New Design Structure (HTML Provided)
1. **Navigation Bar** (Fixed, white text)
   - SSELFIE brand
   - Login link
   - No Features/Pricing links (simplified)

2. **Scene 1: HERO** (Full viewport, snap scroll)
   - Background image with vignette overlay
   - Label: "Your Studio"
   - Headline: "Photos that actually look like you."
   - Description text
   - "Start Creating" button → scrolls to `#membership`

3. **Scene 2: THE MECHANISM** (Split screen)
   - Left: Input/Output image comparison
   - Right: "Upload once. Create forever." explanation

4. **Scene 3: MAYA MODES** (Split screen)
   - Left: "Just Chat" (Classic Mode)
   - Right: "Take Control" (Pro Mode)
   - Center badge: "Your Choice"

5. **Scene 4: FEED PLANNER** (Full viewport)
   - Background image
   - "Plan your perfect grid" description

6. **Scene 5: ACADEMY** (Full viewport)
   - "We help you grow" section
   - Left border accent

7. **Scene 6: PRICING** (`#membership`)
   - Background image
   - Simplified pricing:
     - Membership: $29/month (50 photos, AI model, Maya chat, Feed Planner, Academy)
     - One-time packs link
   - Checkout button: `/checkout/membership`

8. **Scene 7: FOOTER**
   - FAQ section
   - Terms/Privacy links
   - Copyright

9. **Navigation Dots** (Fixed right side)
   - 7 dots for each scene
   - Active state tracking

---

## 🔍 Key Logic to Preserve

### 1. Analytics Tracking
**Current Implementation:**
- `trackCTAClick(location, label, destination)`
- `trackPricingView()`
- `trackCheckoutStart(productId, promoCode?)`
- `trackEmailSignup(source, location)`
- `trackSocialClick(platform, url)`

**Action Required:**
- Map all new CTAs to appropriate tracking calls
- Ensure pricing section view is tracked
- Track "Start Creating" button
- Track blueprint CTA (new)

### 2. Checkout Flow
**Current Implementation:**
```typescript
handleStartCheckout(tierId: string) {
  setCheckoutLoading(tierId)
  trackCheckoutStart(tierId)
  trackCTAClick("pricing", productName, "/checkout")
  const clientSecret = await startEmbeddedCheckout(tierId)
  window.location.href = `/checkout?client_secret=${clientSecret}`
}
```

**New Design:**
- Single "Membership" plan at $29/month
- Link to `/checkout/membership` (server-side route)
- Also need link to `/checkout/credits` for one-time packs

**Action Required:**
- Update pricing to match new design ($29/month)
- Ensure `/checkout/membership` route works
- Add link to `/checkout/credits` for one-time packs
- Verify product ID: `sselfie_studio_membership` (check if $29 is correct price)

### 3. Scroll Behavior
**Current:**
- Smooth scroll to sections
- Sticky footer after 800px scroll
- Parallax effects on hero/about sections

**New:**
- Snap scroll (scroll-snap-type: y mandatory)
- Navigation dots with active states
- Intersection Observer for animations

**Action Required:**
- Implement snap scroll
- Add navigation dots with active state logic
- Implement fade-up animations with Intersection Observer

### 4. Mobile Optimization
**Current:**
- Responsive breakpoints (sm, md, lg)
- Mobile menu
- Touch-optimized buttons (min-height: 44px)

**New:**
- Mobile-first design
- Safe area insets for iPhone
- Viewport units (100dvh)
- Touch-optimized (min-height: 48px)

**Action Required:**
- Ensure all new sections are mobile-optimized
- Test safe area insets
- Verify touch targets

### 5. Image Optimization
**Current:**
- Next.js Image component with:
  - `fill`, `priority`, `quality`, `sizes`, `placeholder="blur"`

**New:**
- Background images via CSS
- Some inline `<img>` tags

**Action Required:**
- Convert background images to Next.js Image where possible
- Optimize image loading
- Add proper alt text

---

## ❌ BETA Mentions to Remove

### Found in Current Code:
1. **`components/sselfie/interactive-pipeline-showcase.tsx`** (Line 921)
   - Text: "Join the beta and get 50% off for life."
   - **Action:** Remove or replace with generic CTA

2. **Commented out in `landing-page.tsx`** (Lines 210-216)
   - Beta banner (already commented, but verify it's not active)

3. **Backend/API references** (Not in landing page, but noted)
   - Various beta-related code in webhooks, email campaigns, etc.
   - **Action:** Only remove from landing page, backend can stay

---

## 🆕 New Requirements

### 1. Free Brand Blueprint CTA
**Location Options:**
- Scene 1 (Hero): Secondary button below "Start Creating"
- Scene 2 (Mechanism): Add as secondary CTA
- Scene 5 (Academy): Add as CTA button
- Scene 6 (Pricing): Add above pricing cards

**Recommended:** Scene 5 (Academy) - makes sense contextually

**Implementation:**
- Link to `/blueprint`
- Track with: `trackCTAClick("academy", "Free Brand Blueprint", "/blueprint")`
- Button style: Match existing button but with outline/secondary variant

### 2. Pricing Update
**Current Pricing:**
- Membership: $79/month (Content Creator Studio)
- One-time: $49 (Instagram Photoshoot)
- Brand Studio: $149/month

**New Design Shows:**
- Membership: $29/month
- One-time: Link to `/checkout/credits`

**⚠️ CRITICAL QUESTION:** New design shows $29/month, but current pricing is $79/month. **CONFIRMED:** Current pricing is $79/month (`sselfie_studio_membership`). Need to verify if new design should use $29 or $79.

**Current Pricing Structure:**
- `sselfie_studio_membership`: $79/month (Content Creator Studio)
- `one_time_session`: $49 (Instagram Photoshoot)
- `brand_studio_membership`: $149/month (Brand Studio)
- Credit packages: $12 (50 credits), $33 (150 credits), $100 (500 credits)

---

## 📋 Implementation Checklist

### Phase 1: Setup & Structure
- [ ] Create new landing page component structure
- [ ] Set up snap scroll container
- [ ] Implement navigation dots component
- [ ] Add Intersection Observer for animations
- [ ] Set up scene components
- [ ] Create `/checkout/credits` route for one-time packs

### Phase 2: Content Migration
- [ ] Scene 1: Hero with new copy
- [ ] Scene 2: Mechanism (upload/create)
- [ ] Scene 3: Maya Modes (split view)
- [ ] Scene 4: Feed Planner
- [ ] Scene 5: Academy + Blueprint CTA
- [ ] Scene 6: Pricing ($79/month, $49 one-time, $149 brand studio)
- [ ] Scene 7: Testimonials (horizontal auto carousel)
- [ ] Scene 8: Story Section (minimal text, new design style)
- [ ] Scene 9: Footer with FAQ

### Phase 3: Logic Integration
- [ ] Add analytics tracking to all CTAs
- [ ] Implement checkout flow
- [ ] Add scroll-to-pricing function
- [ ] Implement navigation dots active states
- [ ] Add loading states for checkout buttons

### Phase 4: Mobile Optimization
- [ ] Test all scenes on mobile
- [ ] Verify safe area insets
- [ ] Test touch targets (min 48px)
- [ ] Test snap scroll on mobile
- [ ] Verify navigation dots on mobile

### Phase 5: Image Optimization
- [ ] Convert CSS backgrounds to Next.js Image where possible
- [ ] Add proper alt text
- [ ] Optimize image sizes
- [ ] Add loading="lazy" for below-fold images

### Phase 6: Cleanup
- [ ] Remove BETA mentions
- [ ] Remove old landing page sections not in new design
- [ ] Clean up unused imports
- [ ] Remove commented code

### Phase 7: Testing
- [ ] Test checkout flow end-to-end
- [ ] Test analytics tracking
- [ ] Test mobile experience
- [ ] Test navigation dots
- [ ] Test scroll behavior
- [ ] Test blueprint CTA link

---

## 🎨 Design Improvements Suggestions

### 1. Navigation Dots
- **Current Design:** Fixed right side, simple dots
- **Suggestion:** Add hover tooltips showing scene names
- **Suggestion:** Make dots slightly larger on mobile for easier tapping

### 2. Pricing Section
- **Current Design:** Single membership card
- **Suggestion:** Add visual hierarchy (accent border, subtle glow)
- **Suggestion:** Add "Most Popular" badge if keeping $79/month

### 3. Blueprint CTA
- **Suggestion:** Use secondary button style (outline) to differentiate from primary CTA
- **Suggestion:** Add icon (sparkles or blueprint icon) for visual interest

### 4. Mobile Menu
- **Current Design:** No mobile menu in new design
- **Suggestion:** Add hamburger menu for mobile (Login + maybe scroll to pricing)

### 5. Loading States
- **Suggestion:** Add skeleton loaders for images
- **Suggestion:** Add smooth transitions between scenes

---

## ⚠️ Questions for Sandra

1. **Pricing:** New design shows $29/month, but current pricing is $79/month. Which is correct?
2. **Blueprint CTA Location:** Where should the free brand blueprint CTA appear? (Recommended: Academy section)
3. **One-Time Packs:** New design links to `/checkout/credits` but this route doesn't exist. Options:
   - Create `/checkout/credits` page showing credit packages
   - Link to `/checkout/one-time` (existing route for $49 photoshoot)
   - Link to studio page where users can buy credits via dialog
4. **Navigation:** Should we keep the Features/Pricing links in nav, or keep it minimal as in new design?
5. **Testimonials:** New design doesn't include testimonials - should we add them or remove from current?
6. **Story Section:** New design doesn't include Sandra's story - should we add it or remove?

---

## 📝 File Changes Required

### Files to Modify:
1. `components/sselfie/landing-page.tsx` - Complete rewrite
2. `components/sselfie/interactive-pipeline-showcase.tsx` - Remove BETA mention

### Files to Create:
1. `components/sselfie/landing-scene-hero.tsx` (if splitting into components)
2. `components/sselfie/landing-scene-pricing.tsx` (if splitting into components)
3. `components/sselfie/navigation-dots.tsx` (new component)

### Files to Check:
1. `lib/products.ts` - ✅ Verified: $79/month is correct
2. `app/checkout/membership/page.tsx` - ✅ Exists and works
3. `app/checkout/credits/page.tsx` - ❌ Does NOT exist - need to create or use alternative
4. `components/credits/buy-credits-dialog.tsx` - Exists but is a dialog component, not a page

---

## 🚀 Implementation Order

1. **Get answers to questions above**
2. **Create new component structure**
3. **Implement Scene 1 (Hero)** - Test immediately
4. **Implement Scene 6 (Pricing)** - Critical for conversion
5. **Implement remaining scenes**
6. **Add analytics tracking**
7. **Mobile optimization pass**
8. **Final testing & cleanup**

---

## 📊 Success Metrics

- [ ] All CTAs track analytics correctly
- [ ] Checkout flow works end-to-end
- [ ] Mobile experience is smooth (no janky scroll)
- [ ] Navigation dots work correctly
- [ ] No BETA mentions visible
- [ ] Blueprint CTA is prominent and functional
- [ ] Page loads < 3s on 3G
- [ ] All images optimized
- [ ] No console errors

