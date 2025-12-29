# Email Sequences Implementation Guide

## Overview

Complete email marketing automation sequences for SSELFIE Studio, written in Sandra's authentic voice with proper UTM tracking and Resend integration.

## Sequences Created

### 1. Welcome Sequence (New Paid Members)
**Trigger:** User completes payment  
**Campaign IDs:** welcome-day-0, welcome-day-3, welcome-day-7

- **Day 0** - Welcome Email (immediate)
  - Subject: "Welcome to SSELFIE Studio! 💋"
  - Goal: Excitement, quick start, first value
  - CTA: "Create Your First Photos"

- **Day 3** - Progress Check
  - Subject: "How are your first photos looking?"
  - Goal: Engagement check, troubleshooting, encouragement
  - CTA: "Continue Creating"

- **Day 7** - Deepening Value
  - Subject: "One week in - you're crushing it! 🚀"
  - Goal: Celebrate progress, introduce advanced features
  - CTA: "Explore Advanced Features"

### 2. Nurture Sequence (Free Users → Paid Conversion)
**Trigger:** User downloads Blueprint freebie  
**Campaign IDs:** nurture-day-1, nurture-day-5, nurture-day-10

- **Day 1** - Value Delivery
  - Subject: "Your Blueprint is ready! (+ surprise inside)"
  - Goal: Deliver freebie, establish trust, soft intro to Studio
  - CTA: "Join SSELFIE Studio"

- **Day 5** - Case Study
  - Subject: "[Name] went from invisible to booked solid using this"
  - Goal: Show transformation, build desire
  - CTA: "See How She Did It"

- **Day 10** - Offer
  - Subject: "Ready to be SEEN? (Special offer inside)"
  - Goal: Convert to paid membership
  - CTA: "Try Once - $49" or "Join Studio - $79/mo"

### 3. Re-engagement Sequence (Inactive Users)
**Trigger:** 30+ days no activity  
**Campaign IDs:** reengagement-day-0, reengagement-day-7, reengagement-day-14

- **Day 0** - Miss You
  - Subject: "I've been thinking about you..."
  - Goal: Re-engage without pressure
  - CTA: "See What's New"

- **Day 7** - New Features
  - Subject: "You haven't seen what Maya can do now..."
  - Goal: Showcase improvements, create FOMO
  - CTA: "Try New Features"

- **Day 14** - Final Offer
  - Subject: "Last call: Come back to Studio (50% off inside)"
  - Goal: Final conversion push
  - CTA: "Claim Your Comeback Offer"

## Files Created

### Email Templates
- `lib/email/templates/welcome-sequence.ts` - Welcome sequence templates
- `lib/email/templates/nurture-sequence.ts` - Nurture sequence templates
- `lib/email/templates/reengagement-sequence.ts` - Re-engagement sequence templates

### Automation Code
- `app/api/cron/welcome-sequence/route.ts` - Welcome sequence cron job

### Database
- `scripts/create-email-sends-table.sql` - Email tracking table migration

## Implementation Steps

### 1. Run Database Migration

```bash
psql $DATABASE_URL -f scripts/create-email-sends-table.sql
```

### 2. Update Vercel Cron Configuration

The cron job is already added to `vercel.json`:
```json
{
  "path": "/api/cron/welcome-sequence",
  "schedule": "0 10 * * *"
}
```

### 3. Set Environment Variables

Ensure these are set in Vercel:
- `CRON_SECRET` - Secret for cron job authentication
- `RESEND_API_KEY` - Resend API key
- `DATABASE_URL` - Neon database connection string

### 4. Test the Sequence

Manually trigger the cron job:
```bash
curl -X GET https://sselfie.ai/api/cron/welcome-sequence \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 5. Monitor Results

Check email logs in:
- Resend dashboard
- `email_logs` table
- `email_sends` table

## UTM Tracking

All checkout links include proper UTM parameters:
- `utm_source=email`
- `utm_medium=email`
- `utm_campaign={campaign_name_slug}`
- `utm_content=cta_button`
- `campaign_id={campaign_id}`

## Pricing References

All emails use current pricing:
- One-Time Session: $49
- Content Creator Studio: $79/month
- Features: 100+ photos/month, 20 video clips, Feed Designer

## Next Steps

1. Create cron jobs for nurture and re-engagement sequences
2. Create weekly newsletter template
3. Create upsell sequence (monthly → annual)
4. Set up Resend segments for each sequence
5. Test all sequences end-to-end

## Notes

- All emails use Sandra's authentic voice (warm, personal, empowering)
- All links use `/checkout/membership` or `/checkout/one-time` (public pages)
- All emails include unsubscribe links via Resend variables
- All emails are mobile-responsive with inline styles
- All emails follow SSELFIE brand guidelines (stone colors, Times New Roman headers)

