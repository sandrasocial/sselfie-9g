# Growth Dashboard Implementation

**Date:** 2025-01-XX  
**Status:** ✅ Complete  
**Phase:** 10 - Growth Analytics Layer

---

## 🎯 Overview

Admin-only Growth Dashboard that aggregates key business metrics: revenue, credit costs, referral ROI, and gross margin. All data is read-only and sourced from existing database tables.

---

## 📁 File Locations

### Backend
- **API Route:** `app/api/admin/growth-dashboard/route.ts`
- **Metrics Helper:** `lib/admin/metrics.ts`

### Frontend
- **Component:** `components/admin/growth-dashboard.tsx`
- **Page:** `app/admin/growth-dashboard/page.tsx`

### Documentation
- **This File:** `docs/GROWTH-DASHBOARD-IMPLEMENTATION.md`

---

## 🔐 Access Control

### Admin Check Pattern
```typescript
async function checkAdminAccess(): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) return false
  
  const user = await getUserByAuthId(authUser.id)
  if (!user) return false
  
  const adminCheck = await sql`SELECT role FROM users WHERE id = ${user.id} LIMIT 1`
  
  return adminCheck[0]?.role === "admin"
}
```

**Access:** `/admin/growth-dashboard` (protected by admin layout)

---

## 📊 Data Sources & Queries

### 1. Revenue Metrics

**Source:** `stripe_payments` table (primary) or `credit_transactions` (fallback)

**Query:**
```sql
SELECT COALESCE(SUM(amount_cents), 0)::int as total_cents
FROM stripe_payments
WHERE status = 'succeeded'
  AND (is_test_mode = FALSE OR is_test_mode IS NULL)
```

**MRR Calculation:**
```sql
SELECT product_type, COUNT(*)::int as count
FROM subscriptions
WHERE status = 'active' AND (is_test_mode = FALSE OR is_test_mode IS NULL)
GROUP BY product_type
```

**Price Mapping:**
- `sselfie_studio_membership`: $97/month (from `PRICING_PRODUCTS`)
- `brand_studio_membership`: $149/month (legacy)
- `one_time_session`: $49 (not included in MRR)

---

### 2. User Metrics

**Source:** `users` table

**Queries:**
```sql
-- Total Users
SELECT COUNT(*)::int as total_users
FROM users
WHERE email IS NOT NULL

-- Active Users (30 days)
SELECT COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int as active_users
FROM users
WHERE email IS NOT NULL
```

---

### 3. Credit Metrics

**Source:** `credit_transactions` table

**Queries:**
```sql
-- Total Credits Issued
SELECT COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int as total_issued
FROM credit_transactions
WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)

-- Total Credits Spent
SELECT COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0 AND transaction_type IN ('image', 'training', 'animation')), 0)::int as total_spent
FROM credit_transactions
WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)

-- Bonus Credits
SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'bonus' AND amount > 0), 0)::int as bonus_credits
FROM credit_transactions
WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)
```

**Cost Calculation:**
- Credits Spent × $0.15 per credit = Credit Cost (USD)

---

### 4. Referral Metrics

**Source:** `referrals` table

**Query:**
```sql
SELECT 
  COUNT(*)::int as total_referrals,
  COUNT(*) FILTER (WHERE status = 'completed')::int as completed_referrals
FROM referrals
```

**Calculations:**
- Conversion Rate: `(completed_referrals / total_referrals) × 100`
- Bonus Cost: `completed_referrals × $11.25` (75 credits × $0.15)
- Revenue Potential: `completed_referrals × $97` (estimated MRR per conversion)
- ROI: `((revenue_potential - bonus_cost) / bonus_cost) × 100`

---

### 5. Email Metrics

**Source:** `email_logs` table

**Query:**
```sql
SELECT 
  COUNT(*)::int as total_sends,
  COUNT(*) FILTER (WHERE email_type IN ('upsell-day-10', 'upsell-freebie-membership'))::int as upsell_emails
FROM email_logs
```

---

### 6. Subscription Metrics

**Source:** `subscriptions` table

**Query:**
```sql
SELECT COUNT(*)::int as active_subscriptions
FROM subscriptions
WHERE status = 'active'
  AND (is_test_mode = FALSE OR is_test_mode IS NULL)
```

---

## 💰 Metrics Definitions & Formulas

### Revenue Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **Total Revenue** | `SUM(stripe_payments.amount_cents) / 100` | `stripe_payments` |
| **MRR** | `SUM(active_subscriptions × monthly_price)` | `subscriptions` + `PRICING_PRODUCTS` |
| **ARPU** | `total_revenue / total_users` | Computed |

### Cost Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **Credit Cost** | `credits_spent × $0.15` | `credit_transactions` |
| **Referral Bonus Cost** | `completed_referrals × $11.25` | `referrals` |
| **Claude API Cost** | `active_users × $15/month` | Estimated |
| **Total Costs** | `credit_cost + referral_cost + claude_cost` | Computed |

### Margin Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **Gross Margin %** | `((revenue - total_costs) / revenue) × 100` | Computed |
| **Net Profit** | `revenue - total_costs` | Computed |

### Referral Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **Conversion Rate** | `(completed_referrals / total_referrals) × 100` | `referrals` |
| **Referral ROI** | `((revenue_potential - bonus_cost) / bonus_cost) × 100` | Computed |

### User Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **Active Users (30d)** | `COUNT(*) WHERE last_login_at > NOW() - 30 days` | `users` |
| **Avg Credit Usage** | `total_credits_spent / active_users` | Computed |

---

## 🔄 API Response Format

```json
{
  "summary": {
    "revenue": 97100.00,
    "creditCost": 31800.00,
    "referralCost": 1125.00,
    "claudeCost": 4680.00,
    "totalCosts": 37605.00,
    "grossMargin": 61.3
  },
  "metrics": {
    "activeUsers": 312,
    "mrr": 54000.00,
    "totalUsers": 1021,
    "activeSubscriptions": 556,
    "referralConversionRate": 18.5,
    "avgCreditUsage": 142.3,
    "avgClaudeCost": 15.00,
    "arpu": 95.20,
    "referralROI": 763.3
  },
  "credits": {
    "totalIssued": 250000,
    "totalSpent": 212000,
    "bonusCredits": 15000,
    "avgUsagePerActiveUser": 679.5
  },
  "referrals": {
    "total": 150,
    "completed": 28,
    "conversionRate": 18.67,
    "bonusCost": 315.00,
    "revenuePotential": 2716.00,
    "roi": 762.2
  },
  "email": {
    "totalSends": 5420,
    "upsellEmails": 320
  },
  "automation": {
    "milestoneBonuses": false,
    "referralBonuses": true,
    "creditGifts": false
  },
  "timestamp": "2025-01-XXT12:00:00.000Z"
}
```

---

## 🎨 UI Components

### Sections

1. **Revenue Overview**
   - Total Revenue (USD)
   - Monthly Recurring Revenue (USD)
   - Average Revenue Per User (USD)

2. **Credit Economics**
   - Total Credits Issued
   - Total Credits Spent
   - Credit Cost (USD)
   - Avg Usage Per Active User

3. **Referral Performance**
   - Total Referrals
   - Completed Referrals
   - Referral Bonus Cost
   - Referral ROI

4. **Margin Health**
   - Gross Margin %
   - Total Costs
   - Claude API Cost
   - Net Profit

5. **User Metrics**
   - Total Users
   - Active Users (30d)
   - Active Subscriptions
   - Avg Claude Cost/User

6. **Automation Status**
   - Milestone Bonuses (Enabled/Disabled)
   - Referral Bonuses (Enabled/Disabled)
   - Credit Gifts (Enabled/Disabled)

7. **Email Metrics**
   - Total Email Sends
   - Upsell Emails

### Design System

- **Palette:** Stone (stone-50 to stone-950)
- **Typography:** SSELFIE design tokens
- **Layout:** Responsive grid (1 col mobile, 2 col tablet, 3-4 col desktop)
- **Components:** StatCard, AutomationBadge
- **No emojis** in UI (per design guidelines)

---

## 🔧 Environment Flags Reference

The dashboard displays the status of these environment variables:

| Flag | Default | Purpose |
|------|---------|---------|
| `MILESTONE_BONUSES_ENABLED` | `false` | Milestone bonus automation |
| `REFERRAL_BONUSES_ENABLED` | `true` | Referral bonus automation |
| `CREDIT_GIFTS_ENABLED` | `false` | Credit gifting feature |

**Status Display:**
- Green dot + "Enabled" text = `true`
- Gray dot + "Disabled" text = `false`

---

## 📈 Data Refresh

- **SWR Configuration:** Auto-refresh every 60 seconds
- **Manual Refresh:** "Refresh" button triggers `mutate()`
- **Export:** "Export CSV" button generates client-side CSV download

---

## 🔒 Security

- **Admin-Only Access:** Route protected by `checkAdminAccess()`
- **Read-Only Queries:** No database writes, only SELECT statements
- **No Schema Changes:** Uses existing tables only
- **Error Handling:** Graceful fallbacks for missing data

---

## ✅ Testing Checklist

- [x] API returns correct aggregated data (JSON)
- [x] Dashboard renders without errors for admin users
- [x] Env flags display accurately
- [x] No writes to database (verified read-only)
- [x] Works in dark and light modes (design tokens)
- [x] Linter passes (no errors)
- [x] Responsive layout (mobile/tablet/desktop)
- [x] CSV export generates correctly
- [x] Refresh button updates data
- [x] Non-admin users see 403 error

---

## 🚀 Usage

### Access Dashboard
1. Navigate to `/admin/growth-dashboard`
2. Must be logged in as admin user
3. Dashboard auto-loads and refreshes every 60 seconds

### Export Data
1. Click "Export CSV" button
2. CSV file downloads with timestamp: `growth-dashboard-YYYY-MM-DD.csv`
3. Includes all metrics in tabular format

### Refresh Data
1. Click "Refresh" button
2. Data reloads from database
3. Timestamp updates

---

## 📊 Key Metrics Explained

### Gross Margin
- **Target:** 30-40% minimum (healthy for SaaS)
- **Calculation:** `(Revenue - Costs) / Revenue × 100`
- **Trend Indicator:** 
  - ↑ Green if ≥ 30%
  - → Neutral if 20-30%
  - ↓ Red if < 20%

### Referral ROI
- **Calculation:** `((Revenue Potential - Bonus Cost) / Bonus Cost) × 100`
- **Revenue Potential:** `completed_referrals × $97/month`
- **Bonus Cost:** `completed_referrals × $11.25`
- **Net-Positive:** ROI > 0% means referrals are profitable

### ARPU (Average Revenue Per User)
- **Calculation:** `total_revenue / total_users`
- **Use Case:** Measure revenue efficiency per user

---

## 🔍 Troubleshooting

### Dashboard Shows Zero Values
- Check database connection (`DATABASE_URL`)
- Verify tables exist (`stripe_payments`, `credit_transactions`, `referrals`, etc.)
- Check admin access (user.role = 'admin')

### Env Flags Show Incorrect Status
- Verify environment variables are set in Vercel
- Check `.env.local` for local development
- Restart server after changing env vars

### CSV Export Fails
- Check browser console for errors
- Verify data is loaded before exporting
- Try different browser if issue persists

---

## 📝 Notes

- **Claude API Cost:** Currently estimated at $15/user/month. Actual tracking would require Claude API usage logs.
- **Referral Revenue Potential:** Simplified calculation (completed × $97). Actual revenue requires tracking referred user purchases.
- **Credit Cost:** Based on actual API costs ($0.15/credit). See `docs/CREDIT-COST-AUDIT.md` for details.

---

## 🔄 Future Enhancements

1. **Historical Trends:** Add time-series data (revenue over time, margin trends)
2. **Claude API Tracking:** Integrate actual Claude API usage logs
3. **Referral Attribution:** Track actual revenue from referred users
4. **Email Open Rates:** Integrate Resend webhooks for open tracking
5. **Milestone Completion Tracking:** Add milestone achievement metrics
6. **Graph Visualizations:** Add charts for revenue trends, margin trends

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Engineering Team
