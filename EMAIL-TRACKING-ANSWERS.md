# Answers to Your Email Tracking Questions

## Q1: How are users correctly tagged and tracked when they convert from emails?

### Current State:
✅ **What Works:**
- When a user purchases via Stripe, the webhook automatically tags them:
  - `status: "customer"` in Resend
  - `converted: "true"` tag
  - Added to `beta_users` segment
  - Tagged in database as `converted_to_user = TRUE`

❌ **What's Missing:**
- **No link back to which email campaign caused the conversion**
- Can't answer: "Which email generated this sale?"

### What I Just Fixed:
✅ **Conversion Attribution Added:**
- Updated Stripe webhook to check for `campaign_id` in session metadata
- When `campaign_id` is present, it now:
  - Updates `admin_email_campaigns.total_converted += 1`
  - Logs conversion in `email_logs` with `email_type = 'campaign_conversion'`
  - Tracks which campaign generated the sale

### How It Works Now:
1. User clicks email link with `campaign_id` parameter
2. Checkout session stores `campaign_id` in metadata
3. When purchase completes, webhook attributes conversion to that campaign
4. Campaign metrics show: opens, clicks, **conversions**, revenue

---

## Q2: How do links in emails work? Do we use direct Stripe checkout links?

### Current State:
**Most emails use direct links:**
```
/studio?checkout=studio_membership
```

**Some use tracking redirect:**
```
/api/email/track-click?id={trackingId}&type={clickType}&redirect=/checkout
```

### Problems:
❌ **No UTM parameters** - Can't track in analytics
❌ **No campaign_id** - Can't attribute conversions
❌ **Inconsistent** - Some track, some don't

### What I Just Created:
✅ **New Helper Function:** `lib/email/generate-tracked-link.ts`
- Generates links with full UTM parameters
- Includes `campaign_id` for conversion tracking
- Format: `/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign={campaign_name}&utm_content=cta_button&campaign_id={campaign_id}`

### Next Step Needed:
⚠️ **Update all email templates** to use `generateTrackedLink()` instead of hardcoded links

---

## Q3: Does the admin agent know best practices?

### What I Just Added:
✅ **Comprehensive Email Marketing Best Practices** in admin agent system prompt:

1. **Link Tracking & Attribution:**
   - Agent now knows to include UTM parameters in ALL links
   - Knows about `campaign_id` for conversion tracking
   - Understands link structure requirements

2. **Conversion Tracking:**
   - Knows how conversion attribution works
   - Understands campaign metrics (opens, clicks, conversions, revenue)

3. **Segmentation Strategy:**
   - Knows when to use each segment
   - Understands frequency and timing

4. **Content Best Practices:**
   - Subject line best practices (50 chars max)
   - Preview text guidelines
   - Mobile-first approach (60%+ mobile opens)
   - CTA optimization

5. **A/B Testing:**
   - Knows what to test (subject lines, CTAs, send times)

6. **Conversion Optimization:**
   - Value proposition placement
   - Social proof usage
   - Scarcity/urgency
   - Risk reversal

---

## Summary: What's Fixed vs. What's Left

### ✅ Fixed Today:
1. **Conversion Attribution** - Webhook now tracks which campaign generated sales
2. **Tracking Helper** - Created `generateTrackedLink()` function
3. **Admin Agent Knowledge** - Added comprehensive email marketing best practices

### ⚠️ Still Needs Work:
1. **Update Email Templates** - Need to use `generateTrackedLink()` in all templates
2. **Capture campaign_id in Checkout** - Need to pass `campaign_id` from URL to checkout session
3. **Update Studio Page** - Need to read `campaign_id` from URL and pass to checkout

---

## How to Test Conversion Tracking

1. **Create a test campaign** via admin agent
2. **Send test email** with tracked link
3. **Click the link** - should include `campaign_id` parameter
4. **Complete purchase** - webhook should attribute conversion
5. **Check campaign metrics** - `total_converted` should increment

---

## Next Steps for Full Implementation

1. **Update email templates** to use `generateTrackedLink()`
2. **Update studio page** to capture and pass `campaign_id` to checkout
3. **Update checkout session creation** to store `campaign_id` in metadata
4. **Test end-to-end** conversion tracking

---

## Current Email Link Examples

**Before (No Tracking):**
```html
<a href="/studio?checkout=studio_membership">Join Studio</a>
```

**After (With Tracking):**
```html
<a href="/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=welcome-back-cold-users&utm_content=cta_button&campaign_id=123">Join Studio</a>
```

This allows:
- ✅ Analytics tracking (UTM parameters)
- ✅ Conversion attribution (campaign_id)
- ✅ Campaign ROI measurement













