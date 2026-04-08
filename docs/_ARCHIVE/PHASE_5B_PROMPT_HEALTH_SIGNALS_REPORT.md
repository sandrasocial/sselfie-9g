# PHASE 5B PROMPT HEALTH SIGNALS + ALERT RULES REPORT

**Date**: 2026-01-17  
**Phase**: 5B - Prompt Health Signals + Alert Rules (MVP)  
**Status**: ✅ COMPLETE

---

## SUMMARY TABLE

| Category | Status | Details |
|----------|--------|---------|
| **API Aggregations** | ✅ ADDED | totalsByStatus, totalsByRoute, errorRateByRoute, providerErrors, driftEvents |
| **Alert Rules** | ✅ IMPLEMENTED | RED/ORANGE/YELLOW severity levels with thresholds |
| **Alert Evaluation** | ✅ CREATED | `lib/maya/prompt-health-alerts.ts` |
| **Dashboard UI** | ✅ UPDATED | Alerts section, error rate table, drift watchlist |
| **Stable Routes** | ✅ ADDED | EP-03, EP-06, EP-05 marked as stable |
| **Docs Updated** | ✅ YES | SYSTEM_REALITY.md updated |
| **No Behavior Changes** | ✅ CONFIRMED | All changes additive, no prompt/model changes |

---

## API CHANGES (NEW FIELDS)

### Response Shape (Additive)

**Endpoint**: `GET /api/admin/prompt-health`

**New Fields Added**:
```typescript
{
  // ... existing fields ...
  totalsByStatus: Array<{ status: string; count: number }>
  totalsByRoute: Array<{
    routeId: string
    total: number
    errors: number
    errorRate: number
  }>
  errorRateByRoute: Array<{
    routeId: string
    total: number
    errors: number
    errorRate: number
  }> // Top 10 routes by error rate (min 10 events)
  providerErrors: Array<{
    provider: string | null
    model: string | null
    errorCount: number
  }> // Top 20 provider/model error counts
  driftEvents: Array<{
    routeId: string
    changeCount: number
    lastChangedAt: string | null
  }> // Fingerprint changes per route in time window
  alerts: Array<{
    severity: 'red' | 'orange' | 'yellow'
    title: string
    detail: string
    routeId?: string
    metricSnapshot?: Record<string, any>
  }> // Evaluated alert rules
}
```

**Evidence**: `app/api/admin/prompt-health/route.ts:85-220`

---

## ALERT RULES IMPLEMENTED

### Alert Evaluation Module

**File**: `lib/maya/prompt-health-alerts.ts`

**Function**: `evaluateAlertRules(routeStats, providerErrors, driftEvents, timeWindowHours)`

**Evidence**: `lib/maya/prompt-health-alerts.ts:50-200`

---

### RED ALERTS (Critical)

**Rule 1**: Route error rate >= 20% AND volume >= 20 in last 24h
- **Threshold**: `errorRate >= 20 && total >= 20 && timeWindowHours <= 24`
- **Alert**: "High Error Rate: {routeId}"
- **Detail**: Shows error rate, error count, total requests

**Rule 2**: Provider/model has >= 10 errors in last 1h
- **Threshold**: `errorCount >= 10 && timeWindowHours <= 1`
- **Alert**: "Provider Error Spike: {provider}/{model}"
- **Detail**: Shows provider/model and error count

---

### ORANGE ALERTS (Elevated)

**Rule 3**: Route error count >= 10 in last 24h
- **Threshold**: `errors >= 10 && errorRate < 20 && timeWindowHours <= 24`
- **Alert**: "Elevated Errors: {routeId}"
- **Detail**: Shows error count, error rate, total requests

**Rule 4**: Route drift count >= 3 in last 24h
- **Threshold**: `changeCount >= 3 && timeWindowHours <= 24`
- **Alert**: "Frequent Drift: {routeId}"
- **Detail**: Shows change count and last changed timestamp

---

### YELLOW ALERTS (Informational)

**Rule 5**: Drift detected in stable routes (last 24h)
- **Threshold**: `changeCount > 0 && routeId in STABLE_ROUTES && timeWindowHours <= 24`
- **Alert**: "Stable Route Drift: {routeId}"
- **Detail**: Indicates potential accidental prompt edits

**Rule 6**: General drift detected (not already covered by orange)
- **Threshold**: `changeCount > 0 && routeId not in STABLE_ROUTES && no orange alert exists`
- **Alert**: "Fingerprint Drift: {routeId}"
- **Detail**: Shows change count and last changed timestamp

---

### Stable Routes List

**Constant**: `STABLE_ROUTES` in `lib/maya/prompt-health-alerts.ts`

**Routes**:
- `EP-03` - Feed prompt generation
- `EP-06` - Blueprint concepts
- `EP-05` - Feed single post

**Purpose**: Used for drift severity weighting (stable routes → YELLOW alerts)

**Evidence**: `lib/maya/prompt-health-alerts.ts:25-30`

---

## UI CHANGES SUMMARY

### New Sections Added

**1. Active Alerts Section**
- **Location**: Top of dashboard (after filters)
- **Display**: Color-coded alert cards (red/orange/yellow)
- **Features**: 
  - Severity icons (AlertTriangle for red, AlertCircle for orange/yellow)
  - Alert title and detail
  - Metric snapshot (JSON) for debugging
- **Sorting**: Red → Orange → Yellow

**Evidence**: `app/admin/prompt-health/page.tsx:255-310`

---

**2. Top Error Rate Routes Table**
- **Location**: After alerts section
- **Display**: Table with route ID, total events, errors, error rate
- **Features**:
  - Color-coded error rates (red >= 20%, orange >= 10%, gray < 10%)
  - Minimum 10 events threshold
  - Top 10 routes by error rate
- **Columns**: Route ID, Total Events, Errors, Error Rate (%)

**Evidence**: `app/admin/prompt-health/page.tsx:312-360`

---

**3. Drift Watchlist Table**
- **Location**: After error rate table
- **Display**: Table with route ID, change count, last changed timestamp
- **Features**:
  - Shows fingerprint changes per route in selected time window
  - Sorted by change count (descending)
- **Columns**: Route ID, Change Count, Last Changed

**Evidence**: `app/admin/prompt-health/page.tsx:362-400`

---

**4. Updated Drift Detection Section**
- **Location**: After drift watchlist
- **Change**: Title updated to "Fingerprint Drift Detection (Last 7 Days)"
- **Purpose**: Clarifies time window (7 days) vs drift watchlist (selected time window)

**Evidence**: `app/admin/prompt-health/page.tsx:402-440`

---

### Interface Updates

**Updated Types**:
- Added `Alert`, `RouteStats`, `ProviderErrorStats`, `DriftEvent` interfaces
- Updated `PromptHealthData` interface with new fields

**Evidence**: `app/admin/prompt-health/page.tsx:9-60`

---

## VERIFICATION STEPS

### Step 1: Verify API Returns New Fields

**Action**: Call `GET /api/admin/prompt-health`

**Expected**:
- Response includes `totalsByStatus`, `totalsByRoute`, `errorRateByRoute`, `providerErrors`, `driftEvents`, `alerts`
- All fields are arrays (may be empty if no data)

**Query**:
```bash
curl -H "Cookie: ..." https://your-domain.com/api/admin/prompt-health
```

---

### Step 2: Simulate High Error Rate (RED Alert)

**Action**: 
1. Generate prompts from a route (e.g., EP-03)
2. Manually insert error events into `prompt_audit_events` table:
   ```sql
   INSERT INTO prompt_audit_events (route_id, fingerprint, status, created_at)
   VALUES ('EP-03', 'test123', 'error', NOW());
   -- Repeat 20+ times to trigger RED alert
   ```

**Expected**:
- RED alert appears: "High Error Rate: EP-03"
- Error rate >= 20% shown in alert detail
- Alert appears in "Active Alerts" section

---

### Step 3: Simulate Drift (YELLOW Alert)

**Action**:
1. Generate prompts from EP-03 (stable route)
2. Manually change fingerprint in `prompt_audit_events`:
   ```sql
   UPDATE prompt_audit_events 
   SET fingerprint = 'newfingerprint123'
   WHERE route_id = 'EP-03' AND created_at >= NOW() - INTERVAL '1 hour'
   LIMIT 1;
   ```

**Expected**:
- YELLOW alert appears: "Stable Route Drift: EP-03"
- Alert indicates potential accidental prompt edits
- Drift appears in "Drift Watchlist" table

---

### Step 4: Verify Error Rate Table

**Action**: Access `/admin/prompt-health`

**Expected**:
- "Top Error Rate Routes" table shows routes with highest error rates
- Error rates color-coded (red/orange/gray)
- Only routes with >= 10 events shown

---

### Step 5: Verify Drift Watchlist

**Action**: Access `/admin/prompt-health` with time range filter

**Expected**:
- "Drift Watchlist" table shows routes with fingerprint changes
- Change count and last changed timestamp displayed
- Updates when time range filter changes

---

### Step 6: Verify Alert Sorting

**Action**: Generate multiple alerts (red, orange, yellow)

**Expected**:
- Alerts sorted by severity: Red → Orange → Yellow
- Each alert shows appropriate color and icon

---

## ROLLBACK INSTRUCTIONS

### Option 1: Git Revert (Recommended)

```bash
# Find the commit hash for Phase 5B
git log --oneline --grep="Phase 5B"

# Revert the commit
git revert <commit-hash>
```

---

### Option 2: Manual Revert

**Step 1**: Remove alert evaluation module

**Files**:
- `lib/maya/prompt-health-alerts.ts` (delete)

**Step 2**: Revert API route changes

**File**: `app/api/admin/prompt-health/route.ts`
- Remove new aggregations (totalsByStatus, totalsByRoute, errorRateByRoute, providerErrors, driftEvents)
- Remove alert evaluation import and call
- Restore original response shape

**Step 3**: Revert dashboard UI changes

**File**: `app/admin/prompt-health/page.tsx`
- Remove alerts section
- Remove error rate table
- Remove drift watchlist table
- Restore original interface types

**Step 4**: Revert documentation

**Files**:
- `docs/_CANONICAL/SYSTEM_REALITY.md` (remove Phase 5B sections)

**Risk**: MINIMAL - All changes additive, no behavior changes

---

## STATUS

✅ **PHASE 5B COMPLETE**

**Summary**:
- ✅ API aggregations added (totalsByStatus, totalsByRoute, errorRateByRoute, providerErrors, driftEvents)
- ✅ Alert rules implemented (RED/ORANGE/YELLOW severity levels)
- ✅ Alert evaluation module created
- ✅ Dashboard UI updated (alerts, error rate table, drift watchlist)
- ✅ Stable routes list added (EP-03, EP-06, EP-05)
- ✅ Documentation updated
- ✅ No behavior changes (all additive)

**Impact**:
- **Actionable Health Metrics**: Founder can now see error rates, drift patterns, and provider issues
- **Alert System**: Automatic detection of critical issues (RED), elevated issues (ORANGE), and informational alerts (YELLOW)
- **Stable Routes Watchlist**: Drift in stable routes triggers alerts (may indicate accidental prompt edits)
- **Error Rate Tracking**: Top routes by error rate identified automatically
- **Drift Monitoring**: Fingerprint changes tracked per route with change counts

**Milestone**: 🎉 **Prompt Health Signals & Alert Rules MVP complete!**

**Next Steps**: 
- Monitor alerts in production
- Adjust thresholds based on real-world data
- Consider adding volume drop detection (optional)
- Consider external alerting integration (future phase)

**Deliverables**:
- ✅ API aggregations added
- ✅ Alert rules implemented
- ✅ Dashboard UI updated
- ✅ Stable routes list added
- ✅ Documentation updated
- ✅ Phase report created

All acceptance criteria met. ✅

---

## END OF REPORT

**Last Updated**: 2026-01-17  
**Milestone**: ✅ Prompt Health Signals & Alert Rules MVP complete
