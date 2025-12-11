# Email Tracking & Conversion Analysis

## Current State Analysis

### ✅ What's Working

1. **Basic Tagging on Conversion**
   - When user purchases via Stripe webhook, they get tagged:
     - `status: "customer"`
     - `converted: "true"`
     - `product: "studio-membership"` or `"one-time-session"`
   - Contact is added to Beta Customers segment

2. **UTM Capture on Signup**
   - Freebie/Blueprint signups capture UTM parameters:
     - `utm_source`, `utm_medium`, `utm_campaign`
     - Stored in `freebie_subscribers` and `blueprint_subscribers` tables

3. **Click Tracking (Partial)**
   - `/api/email/track-click` exists for some templates
   - Tracks clicks in `email_campaign_clicks` table
   - Only used in `launch-followup-email.tsx`

### ❌ What's Missing

1. **No Campaign Attribution**
   - When user converts, there's NO link back to which email campaign caused it
   - Can't answer: "Which email campaign generated this sale?"

2. **No UTM Parameters in Email Links**
   - Most email templates use direct links: `/studio?checkout=studio_membership`
   - Missing UTM parameters like:
     - `utm_source=email`
     - `utm_medium=email`
     - `utm_campaign=campaign_name`
     - `utm_content=cta_button`

3. **No Conversion Tracking**
   - Stripe webhook doesn't check if user came from an email
   - No way to attribute conversion to specific campaign
   - Can't track ROI per campaign

4. **Inconsistent Link Structure**
   - Some templates use tracking links (`/api/email/track-click`)
   - Most use direct links
   - No standard format

5. **Admin Agent Missing Email Best Practices**
   - Doesn't know about:
     - UTM parameter best practices
     - Conversion tracking requirements
     - Email link structure standards
     - A/B testing principles
     - Segmentation strategies

---

## How It Should Work

### Ideal Flow:

```
1. User receives email from campaign "Welcome Back - Cold Users"
   ↓
2. User clicks CTA button with link:
   /studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=welcome_back_cold_users&utm_content=cta_button&campaign_id=123
   ↓
3. User completes purchase
   ↓
4. Stripe webhook fires
   ↓
5. System checks for UTM parameters or campaign_id
   ↓
6. Attributes conversion to campaign_id=123
   ↓
7. Updates admin_email_campaigns:
   - total_converted += 1
   - metrics: { conversions: [...], revenue: [...] }
   ↓
8. Updates Resend contact tags:
   - converted_from_campaign: "welcome_back_cold_users"
   - converted_campaign_id: "123"
```

---

## What Needs to Be Fixed

### 1. Add UTM Parameters to All Email Links

**Current**: `/studio?checkout=studio_membership`

**Should Be**: 
```
/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaign_name_slug}&utm_content=cta_button&campaign_id=${campaign_id}
```

### 2. Track Campaign ID in Checkout Session

When user clicks email link with `campaign_id`, store it in:
- Stripe checkout session metadata
- Local storage (for client-side tracking)
- URL parameters (for server-side tracking)

### 3. Attribute Conversions in Stripe Webhook

When `checkout.session.completed` fires:
- Check session metadata for `campaign_id`
- Update `admin_email_campaigns.total_converted`
- Log conversion in `email_logs` with `email_type = 'campaign_conversion'`

### 4. Add Email Best Practices to Admin Agent

The agent should know:
- Always include UTM parameters in links
- Use campaign-specific tracking IDs
- Structure links for conversion attribution
- Best practices for email marketing in 2025

---

## Recommended Implementation

### Phase 1: Update Email Link Structure
- Add helper function to generate tracked links
- Update all email templates to use tracked links
- Include campaign_id in all CTAs

### Phase 2: Conversion Attribution
- Store campaign_id in Stripe session metadata
- Update webhook to attribute conversions
- Track conversion metrics per campaign

### Phase 3: Admin Agent Enhancement
- Add email marketing best practices to system prompt
- Teach agent about UTM parameters
- Include conversion tracking requirements

---

## Current Link Examples

**Welcome Back Email**: `/studio` (no tracking)
**Upsell Day 10**: `/studio?checkout=studio_membership` (no tracking)
**Launch Followup**: Uses `/api/email/track-click` (has tracking)

**Problem**: Inconsistent, most have no tracking

---

## Questions Answered

**Q: How are users correctly tagged when they convert?**
- ✅ They get tagged with `converted: "true"` and `status: "customer"`
- ❌ But NO link to which email campaign caused the conversion

**Q: How do links in emails work?**
- Most use direct Stripe checkout links: `/studio?checkout=studio_membership`
- Some use tracking redirect: `/api/email/track-click`
- ❌ No UTM parameters for attribution
- ❌ No campaign_id for conversion tracking

**Q: Does admin agent know best practices?**
- ❌ No - missing email marketing best practices
- ❌ Doesn't know about UTM parameters
- ❌ Doesn't know about conversion tracking

---

## Next Steps

1. **Create link tracking helper** - Generate tracked links with UTM + campaign_id
2. **Update all email templates** - Use tracked links
3. **Update Stripe webhook** - Attribute conversions to campaigns
4. **Enhance admin agent** - Add email marketing best practices
5. **Add conversion metrics** - Track ROI per campaign


