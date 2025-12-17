# Email Analytics Fixes Applied

## 🔍 Issues Found

### 1. **Missing `campaign_id` in Email Logs**
- **Problem**: `logEmailSend` function in `lib/email/send-email.ts` wasn't accepting `campaignId` parameter
- **Impact**: 4,464 emails in last 30 days don't have `campaign_id`, so they don't show in campaign analytics
- **Fix**: ✅ Added `campaignId` parameter to `logEmailSend` function and included it in INSERT statement

### 2. **Incorrect "Sent" Count Calculation**
- **Problem**: Analytics query only used `COUNT(DISTINCT el.id)` from `email_logs`, but if `campaign_id` wasn't set, emails weren't counted
- **Impact**: Campaigns showing "Sent: 1" but actual count might be different
- **Fix**: ✅ Updated query to use `COALESCE` and `Math.max()` to prefer `email_logs` count but fall back to `admin_email_campaigns.total_sent`

### 3. **Email Opens Not Being Tracked**
- **Problem**: 4,329 emails sent in last 7 days, but **0** have `opened_at` timestamps
- **Impact**: All open rates show 0.0% even though emails were likely opened
- **Root Cause**: Resend webhook may not be receiving `email.opened` events, or `resend_message_id` isn't matching
- **Status**: ⚠️ Needs manual verification

### 4. **Campaign Status Mismatch**
- **Problem**: Campaign ID 3 shows status "sending" but emails are already logged as sent
- **Impact**: Confusing status display
- **Fix**: ✅ Analytics now uses correct sent count calculation

## ✅ Fixes Applied

### Fix 1: Added `campaign_id` to Email Logging
**File**: `lib/email/send-email.ts`

```typescript
async function logEmailSend(
  userEmail: string,
  emailType: string,
  status: "sent" | "delivered" | "failed" | "error",
  resendMessageId?: string,
  errorMessage?: string,
  campaignId?: number, // ✅ Added
): Promise<void> {
  // ... INSERT now includes campaign_id
}
```

### Fix 2: Improved Analytics Query
**File**: `app/api/admin/email-analytics/route.ts`

```typescript
// Now uses both email_logs count AND admin_email_campaigns.total_sent
const sentFromLogs = Number(campaign.total_emails_sent_from_logs) || 0
const sentFromCampaign = Number(campaign.total_sent_from_campaign) || 0
const sent = Math.max(sentFromLogs, sentFromCampaign) // ✅ Use the higher count
```

## ⚠️ Remaining Issues

### Issue 1: Email Opens Not Tracked
**Symptom**: 0 opens tracked for 4,329 emails sent in last 7 days

**Possible Causes**:
1. Resend webhook not configured in Resend dashboard
2. `RESEND_WEBHOOK_SECRET` not set in Vercel
3. Webhook URL not pointing to correct endpoint
4. `resend_message_id` not matching between send and webhook events

**Action Required**:
1. Check Resend Dashboard → Webhooks
2. Verify webhook URL: `https://sselfie.ai/api/webhooks/resend`
3. Verify `RESEND_WEBHOOK_SECRET` is set in Vercel
4. Test webhook by sending a test email and checking if `email.opened` event is received

### Issue 2: Many Emails Without `campaign_id`
**Symptom**: 4,464 emails in last 30 days don't have `campaign_id`

**Cause**: These emails were sent before the fix, or via code paths that don't pass `campaignId`

**Impact**: These emails won't show in campaign analytics

**Note**: Future emails will have `campaign_id` after the fix

## 📊 Expected Results After Fixes

1. ✅ **New emails** will have `campaign_id` set correctly
2. ✅ **Sent counts** will be more accurate (using max of both sources)
3. ⚠️ **Open/click tracking** still needs webhook verification
4. ✅ **Campaign status** will be more accurate

## 🔧 Manual Steps Required

1. **Verify Resend Webhook**:
   - Go to Resend Dashboard → Webhooks
   - Check if webhook is configured: `https://sselfie.ai/api/webhooks/resend`
   - Verify events enabled: `email.opened`, `email.clicked`, `email.delivered`
   - Test webhook by sending a test email

2. **Check Environment Variables**:
   - Verify `RESEND_WEBHOOK_SECRET` is set in Vercel
   - Should match the secret in Resend dashboard

3. **Test Email Tracking**:
   - Send a test email to yourself
   - Check if `email.opened` event is received
   - Verify `opened_at` timestamp is set in `email_logs`

## 📝 Next Steps

1. Deploy the fixes
2. Send a test campaign
3. Verify `campaign_id` is set in new emails
4. Check if opens/clicks are being tracked
5. Monitor analytics dashboard for accuracy

---

**Summary**: Fixed `campaign_id` logging and improved sent count calculation. Email opens still need webhook verification.
