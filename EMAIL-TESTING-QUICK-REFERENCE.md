# Email Testing - Quick Reference Card

## 🎯 One-Click Test Process

```
1. Go to: /admin/test-campaigns
2. Click "Create Campaign"
3. Fill form → Click "Create Campaign"
4. Click "Send Test" button
5. Check email inbox
6. Verify link has tracking parameters
```

---

## 📍 Key URLs

- **Test Campaigns Page**: `/admin/test-campaigns`
- **Admin Agent Chat**: `/admin/agent`
- **Campaign API**: `/api/admin/email/run-scheduled-campaigns`

---

## ✅ What to Verify

### In Email:
- [ ] Email received in inbox
- [ ] Subject line correct
- [ ] Link includes `utm_source=email`
- [ ] Link includes `utm_medium=email`
- [ ] Link includes `utm_campaign=...`
- [ ] Link includes `campaign_id=...`
- [ ] Link includes `campaign_type=...`

### After Click:
- [ ] Redirects to `/studio`
- [ ] URL parameters preserved
- [ ] No errors in browser console

### After Purchase (Test):
- [ ] Check server logs for: `✅ Attributed conversion to campaign`
- [ ] Check database: `total_converted` increments
- [ ] Check `email_logs` for conversion entry

---

## 🔧 API Commands

### Send Test Email
```bash
POST /api/admin/email/run-scheduled-campaigns
{
  "mode": "test",
  "campaignId": 123
}
```

### Send Live Campaign
```bash
POST /api/admin/email/run-scheduled-campaigns
{
  "mode": "live",
  "campaignId": 123
}
```

### Browser Console (Quick Test)
```javascript
fetch('/api/admin/email/run-scheduled-campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ mode: 'test', campaignId: 123 })
})
.then(r => r.json())
.then(console.log)
```

---

## 📊 Database Queries

### Check Campaign Status
```sql
SELECT id, campaign_name, status, total_recipients, total_converted
FROM admin_email_campaigns
WHERE id = 123;
```

### Check Conversion Logs
```sql
SELECT user_email, email_type, status, sent_at
FROM email_logs
WHERE email_type LIKE '%campaign%'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## ⚠️ Safety Checklist

Before sending LIVE:
- [ ] Test email received and verified
- [ ] Links have tracking parameters
- [ ] Test purchase works
- [ ] Conversion tracking works
- [ ] No errors in logs
- [ ] Campaign preview looks good

---

## 🆘 Common Issues

**No tracking parameters?**
→ Check campaign was created with `id` and `campaign_name`

**Conversion not tracked?**
→ Check Stripe webhook logs for `campaign_id` in metadata

**Test email not received?**
→ Check `ADMIN_EMAIL` env variable and Resend API key

**Campaign not sending?**
→ Check `status` is `'scheduled'` and `scheduled_for` is in past

---

## 📖 Full Guide

See `EMAIL-ACTIVATION-AND-TESTING-GUIDE.md` for complete instructions.








