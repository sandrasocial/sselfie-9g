# Google Analytics 4 & Facebook Pixel Implementation Summary

## ✅ What Has Been Implemented

### 1. **Analytics Helper Library** (`lib/analytics.ts`)
   - `trackEvent()` - Generic GA4 event tracking
   - `trackFacebookEvent()` - Facebook Pixel event tracking
   - `trackCTAClick()` - CTA button clicks
   - `trackPricingView()` - Pricing section view tracking
   - `trackCheckoutStart()` - Checkout initiation
   - `trackEmailSignup()` - Email form submissions
   - `trackSocialClick()` - Social media link clicks
   - `trackPurchase()` - Purchase completion

### 2. **GA4 & Facebook Pixel Scripts** (`app/layout.tsx`)
   - Google Analytics 4 script with `afterInteractive` strategy
   - Facebook Pixel script with `afterInteractive` strategy
   - Both scripts only load if environment variables are set

### 3. **Event Tracking Added To:**

#### Landing Page (`components/sselfie/landing-page.tsx`)
   - ✅ Hero CTA: "SEE HOW IT WORKS" → `cta_click`
   - ✅ Nav CTA: "GET STARTED" → `cta_click`
   - ✅ Mobile Nav CTA: "GET STARTED" → `cta_click`
   - ✅ Pricing section view → `pricing_view` (Intersection Observer)
   - ✅ Checkout buttons (all 3 tiers) → `checkout_start` + `cta_click`
   - ✅ Email signup form → `email_signup`
   - ✅ Instagram link → `social_click`
   - ✅ TikTok link → `social_click`

#### Blueprint Page (`components/blueprint/blueprint-email-capture.tsx`)
   - ✅ Email capture form → `email_signup` (tracks as "brand_blueprint")

#### Checkout Page (`app/checkout/page.tsx`)
   - ✅ Checkout page view → `checkout_start`

---

## 🔧 Environment Variables Required

### Required (for tracking to work):

1. **Google Analytics 4 Measurement ID**
   - Variable: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - Format: `G-XXXXXXXXXX` or `UA-XXXXXXXXX-X`
   - Where to get: Google Analytics 4 → Admin → Data Streams → Your Stream → Measurement ID

2. **Facebook Pixel ID** (Optional but recommended)
   - Variable: `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`
   - Format: `1234567890123456` (15-16 digit number)
   - Where to get: Facebook Events Manager → Settings → Pixel ID

---

## 📊 Events Being Tracked

### Automatic Events (No code needed):
- ✅ **Page views** - Automatically tracked by GA4 script

### Custom Events (Tracked via code):

1. **`cta_click`**
   - Triggered: When user clicks any CTA button
   - Parameters:
     - `button_location`: "hero", "nav", "mobile_nav", "pricing"
     - `button_text`: Button text (e.g., "GET STARTED", "SEE HOW IT WORKS")
     - `destination`: Where button links to (e.g., "#pricing", "/checkout")

2. **`pricing_view`**
   - Triggered: When pricing section scrolls into view (30% visible)
   - Parameters:
     - `section`: "pricing"
   - Note: Only tracks once per page load

3. **`checkout_start`**
   - Triggered: When checkout page loads or checkout button clicked
   - Parameters:
     - `product_type`: "one_time_session", "sselfie_studio_membership", "brand_studio_membership"
     - `value`: Product price (optional)
     - `currency`: "USD"

4. **`email_signup`**
   - Triggered: When email form is submitted
   - Parameters:
     - `source`: "landing_page", "brand_blueprint"
     - `form_type`: "waitlist", "blueprint_progress", "blueprint_results"

5. **`social_click`**
   - Triggered: When social media link is clicked
   - Parameters:
     - `platform`: "instagram", "tiktok"
     - `destination`: Full URL

6. **`purchase`** (Ready to use, not yet implemented)
   - For tracking completed purchases
   - Will be called from Stripe webhook or success page

---

## 🎯 Facebook Pixel Events

The following Facebook Pixel events are automatically tracked alongside GA4 events:

- **`PageView`** - Automatic on page load
- **`Lead`** - When CTA clicked or email signup
- **`ViewContent`** - When pricing section viewed
- **`InitiateCheckout`** - When checkout starts
- **`Purchase`** - When purchase completes (ready to implement)

---

## 🧪 Testing

### Test GA4 Tracking:

1. **Open Browser Console:**
   - Press F12 → Console tab

2. **Check for gtag:**
   ```javascript
   typeof window.gtag // Should return "function"
   ```

3. **Manually trigger events:**
   ```javascript
   window.gtag('event', 'test_event', { test_param: 'test_value' })
   ```

4. **Check GA4 Real-Time Reports:**
   - Go to Google Analytics → Reports → Real-time
   - Should see events within 30 seconds

### Test Facebook Pixel:

1. **Install Facebook Pixel Helper Chrome Extension:**
   - https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc

2. **Check Pixel Status:**
   - Extension icon should show green if pixel is firing
   - Click icon to see events being tracked

3. **Check Facebook Events Manager:**
   - Go to Events Manager → Test Events
   - Should see events in real-time

---

## 📈 Viewing Analytics Data

### Google Analytics 4:

1. **Real-Time Events:**
   - Reports → Real-time → Events
   - See events as they happen

2. **Custom Events:**
   - Reports → Engagement → Events
   - See all custom events with counts

3. **Conversions:**
   - Admin → Events → Mark events as conversions
   - Recommended: Mark `checkout_start` and `purchase` as conversions

### Facebook Events Manager:

1. **Test Events:**
   - Events Manager → Test Events
   - Real-time event tracking

2. **Events Dashboard:**
   - Events Manager → Overview
   - See event counts and trends

---

## 🚀 Next Steps

### 1. Set Environment Variables:
   ```bash
   # In Vercel Dashboard:
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   NEXT_PUBLIC_FACEBOOK_PIXEL_ID=1234567890123456
   ```

### 2. Deploy:
   - Push changes to main branch
   - Vercel will auto-deploy
   - Scripts will load automatically

### 3. Verify:
   - Check browser console for gtag/fbq
   - Test events in GA4 Real-Time
   - Check Facebook Pixel Helper extension

### 4. Set Up Conversions (Optional):
   - In GA4: Mark `checkout_start` and `purchase` as conversions
   - In Facebook: Set up conversion events for Lead, InitiateCheckout, Purchase

---

## ✅ Implementation Complete

All tracking is now in place:
- ✅ GA4 script loaded
- ✅ Facebook Pixel script loaded
- ✅ All CTA buttons tracked
- ✅ Pricing section view tracked
- ✅ Checkout start tracked
- ✅ Email signups tracked
- ✅ Social links tracked

**Just add your environment variables and you're ready to track!** 🎉
