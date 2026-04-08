# Growth Forecast & Margin Alerts Implementation

## Overview

This document describes the implementation of predictive growth forecasting and automated margin alerts for the SSELFIE Studio Growth Dashboard.

## Forecast Formulas

### Linear Regression
Uses simple least-squares linear regression: `y = mx + b`

**Where:**
- `m` = slope (rate of change)
- `b` = intercept (starting value)
- `y` = predicted value
- `x` = time period (0, 1, 2, ...)

**R-squared Calculation:**
- `R² = 1 - (SS_res / SS_tot)`
- `SS_res` = Sum of squared residuals
- `SS_tot` = Total sum of squares
- Confidence = R² (0-1 scale)

### Revenue/MRR Forecast
- Uses 3-month historical data
- Extrapolates trend to next month
- Formula: `forecast = slope × 3 + intercept`

### Cost Forecasts
- **Credit Cost:** Average of last 2 months
- **Referral Cost:** Average of last 2 months
- **Claude Cost:** `activeUsers × avgClaudeCostPerUser`

### Gross Margin Forecast
- `grossMargin = ((revenue - totalCosts) / revenue) × 100`
- Uses forecasted revenue and costs

## Files Created

### 1. `/lib/admin/forecast.ts`
**Purpose:** Forecast engine using linear regression to predict next-month metrics.

**Key Functions:**
- `generateForecast()`: Main function that generates forecast for next month
- `linearRegression()`: Simple linear regression calculator (y = mx + b)
- `getHistoricalRevenue()`: Fetches last 3 months of revenue data
- `getHistoricalMRR()`: Fetches last 3 months of MRR data
- `getHistoricalCreditCost()`: Fetches last 2 months of credit cost data
- `getHistoricalReferralCost()`: Fetches last 2 months of referral cost data

**Forecast Metrics:**
- Revenue (3-month trend)
- MRR (3-month trend)
- Credit Cost (2-month average)
- Referral Cost (2-month average)
- Claude API Cost (based on active users)
- Gross Margin (computed)
- Confidence Score (0-1, based on R-squared)
- Trend Direction (up/down/stable)

### 2. `/lib/admin/alerts.ts`
**Purpose:** Margin alert system that checks current metrics against thresholds.

**Key Functions:**
- `checkMarginAlerts()`: Main function that checks all thresholds and returns alerts
- `wasAlertSentRecently()`: Checks if alert was sent within cooldown period
- `recordAlertSent()`: Records that an alert was sent

**Alert Thresholds:**
- **Gross Margin:** < 45% (warning)
- **Claude Cost:** > $20 avg per active user (critical)
- **Referral Conversion:** < 10% (warning)

**Alert Functions:**
- `checkMarginThreshold(currentGrossMargin, threshold = 45)`: Returns true if margin below threshold
- `checkClaudeCost(avgClaudeCost, threshold = 20)`: Returns true if Claude cost exceeds threshold
- `checkReferralConversion(rate, threshold = 0.1)`: Returns true if conversion rate below threshold

**Alert Types:**
- `critical`: Requires immediate action
- `warning`: Needs attention soon
- `info`: Informational only

### 3. `/app/api/admin/growth-forecast/route.ts`
**Purpose:** API endpoint to fetch forecast data (admin-only).

**Access Control:**
- Requires admin role
- Returns 403 if not admin

**Response:**
```json
{
  "success": true,
  "forecast": {
    "nextMonth": "2025-02",
    "revenueForecast": 12345.67,
    "mrrForecast": 8901.23,
    "creditCostForecast": 2345.67,
    "referralCostForecast": 123.45,
    "claudeCostForecast": 456.78,
    "totalCostsForecast": 2925.90,
    "grossMarginForecast": 76.3,
    "confidence": 0.85,
    "trend": "up"
  },
  "timestamp": "2025-01-08T12:00:00.000Z"
}
```

### 4. `/app/api/cron/admin-alerts/route.ts`
**Purpose:** Daily cron job to check margin thresholds and send email alerts.

**Schedule:** Daily at 7 AM UTC

**Protection:** Requires `CRON_SECRET` in Authorization header

**Process:**
1. Verify cron secret
2. Fetch current metrics (revenue, MRR, costs, margins)
3. Check for margin alerts using threshold functions
4. If alerts exist and not sent today, send summary email
5. Record alert summary in `admin_alert_sent` table
6. Log results to `/api/logs/alerts` (non-blocking)

**Email Format:**
- Subject: "⚠️ SSELFIE Margin Alert"
- HTML email with alert summary
- Includes recommended actions
- Dashboard link included
- Sent to: `ssa@ssasocial.com`, `hello@sselfie.ai`
- Sent only once per day (24-hour cooldown)

### 5. `/components/admin/forecast-section.tsx`
**Purpose:** UI component to display forecast in Growth Dashboard.

**Features:**
- Fetches forecast data using SWR (auto-refresh every 5 minutes)
- Displays next month forecast with confidence score
- Shows trend indicator (up/down/stable)
- **Projected revenue text:** "Projected revenue next month: $X (+Y%)"
- **Gross margin trend:** Arrow + color + percentage change
- **Forecast confidence:** Progress bar (0-100%)
- **Margin alert banner:** Shows if margin forecast < 50%
- Responsive grid layout
- Cost breakdown section

**Styling:**
- Matches Growth Dashboard design system
- Stone palette, Times New Roman typography
- Mobile-optimized

### 6. `/docs/GROWTH-FORECAST-IMPLEMENTATION.md`
This documentation file.

## Integration

### Growth Dashboard Integration
The `ForecastSection` component is integrated into `/components/admin/growth-dashboard.tsx`:
- Placed at the top of the dashboard (before Revenue Overview)
- Auto-refreshes every 5 minutes
- Shows loading and error states

### Cron Job Registration
Added to `vercel.json`:
```json
{
  "path": "/api/cron/admin-alerts",
  "schedule": "0 9 * * *"
}
```

## Database Dependencies

### `admin_alert_sent` Table
The alerts system uses the existing `admin_alert_sent` table to track sent alerts and prevent spam.

**Schema:**
- `id`: SERIAL PRIMARY KEY
- `alert_id`: VARCHAR(100) NOT NULL
- `alert_type`: VARCHAR(50) NOT NULL
- `sent_at`: TIMESTAMPTZ NOT NULL
- `alert_data`: JSONB (optional)
- `created_at`: TIMESTAMPTZ NOT NULL

**Indexes:**
- `idx_admin_alert_sent_alert_id` on `alert_id`
- `idx_admin_alert_sent_sent_at` on `sent_at DESC`

## Forecast Algorithm

### Linear Regression
Uses simple least-squares linear regression:
- Formula: `y = mx + b`
- Where `m` = slope, `b` = intercept
- R-squared calculated for confidence score

### Data Requirements
- **Revenue/MRR:** Minimum 2 months of data (prefers 3)
- **Credit/Referral Costs:** Minimum 2 months of data
- **Fallback:** Uses current values if insufficient data

### Confidence Calculation
- Based on R-squared value from regression
- Ranges from 0-1 (0% to 100%)
- Displayed as percentage in UI

## Alert System

### Cooldown Period
- **24 hours** between identical alerts
- Prevents email spam
- Tracked in `admin_alert_sent` table

### Alert ID Format
- Format: `{metric}-{severity}`
- Examples: `grossMargin-critical`, `mrr-critical`, `creditCost-warning`

### Email Delivery
- Sent to all admin emails in `ADMIN_EMAILS` array
- HTML and plain text versions
- Includes dashboard link for quick access

## Environment Variables

### Required
- `CRON_SECRET`: Secret for cron job authentication
- `DATABASE_URL`: Neon database connection string
- `RESEND_API_KEY`: Resend API key for email sending
- `NEXT_PUBLIC_SITE_URL`: Base URL for dashboard links

### Optional
- `ADMIN_EMAIL`: Primary admin email (defaults to `ssa@ssasocial.com`)

## Testing

### Manual Testing
1. **Forecast API:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/admin/growth-forecast
   ```

2. **Alerts Cron:**
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/admin-alerts
   ```

### Expected Behavior
- Forecast should show next month predictions
- Alerts should trigger when thresholds are exceeded
- Emails should be sent only once per 24 hours per alert type
- Dashboard should display forecast section at top

## Future Enhancements

### Potential Improvements
1. **Multi-month Forecasts:** Extend to 3-6 month forecasts
2. **Confidence Intervals:** Show upper/lower bounds
3. **Historical Forecast Accuracy:** Track forecast vs. actual
4. **Custom Thresholds:** Allow admins to set custom alert thresholds
5. **Alert Dashboard:** UI to view and manage alerts
6. **Slack/Webhook Integration:** Send alerts to Slack or webhooks
7. **Forecast Explanations:** Show what factors influenced the forecast

## Troubleshooting

### Common Issues

**Forecast shows 0% confidence:**
- Check if sufficient historical data exists (minimum 2 months)
- Verify database queries are returning data

**Alerts not sending:**
- Verify `CRON_SECRET` is set correctly
- Check `admin_alert_sent` table exists
- Verify Resend API key is valid
- Check email logs for errors

**Forecast values seem incorrect:**
- Verify historical data is accurate
- Check for data gaps in monthly aggregates
- Review regression calculations

## Related Documentation
- `/docs/GROWTH-DASHBOARD-IMPLEMENTATION.md`: Growth Dashboard overview
- `/docs/ANALYTICS-AUDIT-REPORT.md`: Analytics system audit
- `/docs/CREDIT-COST-AUDIT.md`: Credit cost analysis
