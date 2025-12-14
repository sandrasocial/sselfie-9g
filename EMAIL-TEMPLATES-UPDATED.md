# Email Templates Updated with Tracked Links

## ✅ What Was Updated

All email templates that contain checkout links have been updated to use tracked links with UTM parameters and campaign attribution.

### Templates Updated:

1. **`upsell-day-10.tsx`**
   - ✅ Now accepts `campaignId` and `campaignName` parameters
   - ✅ Uses `generateTrackedCheckoutLink()` for checkout links
   - ✅ Falls back to regular link if campaign info not available

2. **`upsell-freebie-membership.tsx`**
   - ✅ Now accepts `campaignId` and `campaignName` parameters
   - ✅ Uses `generateTrackedCheckoutLink()` for checkout links
   - ✅ Falls back to regular link if campaign info not available

3. **`win-back-offer.tsx`**
   - ✅ Now accepts `campaignId` and `campaignName` parameters
   - ✅ Uses `generateTrackedCheckoutLink()` for checkout links
   - ✅ Preserves offer code in URL parameters
   - ✅ Falls back to regular link if campaign info not available

4. **`nurture-day-7.tsx`**
   - ✅ Now accepts `campaignId` and `campaignName` parameters
   - ✅ Uses `generateTrackedCheckoutLink()` for P.S. section link
   - ✅ Falls back to regular link if campaign info not available

5. **`welcome-back-reengagement.tsx`**
   - ✅ Now accepts `campaignId` and `campaignName` parameters
   - ✅ Uses `generateTrackedLink()` for studio link (non-checkout)
   - ✅ Falls back to regular link if campaign info not available

### Executor Updated:

**`lib/email/run-scheduled-campaigns.ts`**
- ✅ Updated `getEmailContent()` to pass `campaign.id` and `campaign.campaign_name` to all templates
- ✅ All template calls now include campaign tracking info

---

## How It Works

### Before:
```html
<a href="/studio?checkout=studio_membership">Join Studio</a>
```
- ❌ No tracking
- ❌ No conversion attribution
- ❌ No analytics data

### After:
```html
<a href="/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=upsell-day-10&utm_content=cta_button&campaign_id=123&campaign_type=upsell_day_10">Join Studio</a>
```
- ✅ Full UTM tracking
- ✅ Conversion attribution via `campaign_id`
- ✅ Analytics-ready

---

## Backward Compatibility

All templates maintain backward compatibility:
- If `campaignId` or `campaignName` is not provided, they fall back to regular links
- Existing code that doesn't pass campaign info will continue to work
- New code can optionally pass campaign info for tracking

---

## Next Steps

1. **Test tracked links** - Send test emails and verify links include tracking parameters
2. **Verify conversion tracking** - Complete a purchase from an email and check if conversion is attributed
3. **Update admin agent** - The agent already knows to include tracking (from previous update)
4. **Monitor campaign metrics** - Check `admin_email_campaigns.total_converted` after sending campaigns

---

## Files Changed

- `lib/email/templates/upsell-day-10.tsx`
- `lib/email/templates/upsell-freebie-membership.tsx`
- `lib/email/templates/win-back-offer.tsx`
- `lib/email/templates/nurture-day-7.tsx`
- `lib/email/templates/welcome-back-reengagement.tsx`
- `lib/email/run-scheduled-campaigns.ts`

---

## Testing Checklist

- [ ] Send test email from campaign executor
- [ ] Verify links include UTM parameters
- [ ] Verify links include `campaign_id`
- [ ] Click link and complete purchase
- [ ] Check Stripe webhook logs for `campaign_id` in metadata
- [ ] Verify `admin_email_campaigns.total_converted` increments
- [ ] Check `email_logs` for conversion entry












