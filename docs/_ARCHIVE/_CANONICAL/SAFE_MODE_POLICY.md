# SAFE MODE POLICY

**Last Updated**: 2026-01-17 (Phase 6A)  
**Purpose**: Define safe-mode behavior for incident response  
**Audience**: Founder, operations team

---

## OVERVIEW

Safe Mode is a **non-breaking incident response system** that can reduce generation blast radius during incidents while maintaining system availability.

**Key Principle**: Safe Mode must be **reversible instantly** via environment variable and **must not break public flows** when disabled.

---

## ENVIRONMENT VARIABLE

**`SAFE_MODE`**
- **Purpose**: Enable/disable safe mode
- **Values**: `true` (enabled) or `false` (disabled)
- **Default**: `false` (non-breaking)
- **Location**: Vercel environment variables

---

## SAFE MODE BEHAVIOR (When SAFE_MODE=true)

### 1. Reduce Concurrency / Load

**Action**: Tighten rate limits for high-cost routes (only those that already rate limit)

**Routes Affected**:
- Routes that already implement rate limiting (e.g., `/api/feed/[feedId]/generate-single`)

**Implementation**:
- Multiply existing rate limit by 0.5 (reduce by 50%)
- Example: If route allows 10 requests/min, safe mode allows 5 requests/min

**Rules**:
- Only applies to routes that already have rate limits
- No new rate limits added
- Fail-open: If rate limit check fails, allow request

---

### 2. Protect Internal-Only Endpoints

**Action**: Internally treat `ENFORCE_INTERNAL_ONLY_ENDPOINTS=true` even if flag is off

**Implementation**:
- When `SAFE_MODE=true`, internal-only guard behaves as if `ENFORCE_INTERNAL_ONLY_ENDPOINTS=true`
- Requires `x-sselfie-internal` header for internal routes

**Routes Affected**:
- `/api/maya/generate-prompt-suggestions` (EP-02)
- Any other routes marked as INTERNAL

**Rules**:
- Only applies to routes classified as INTERNAL
- PUBLIC routes remain unaffected

---

### 3. Enhanced Error Logging

**Action**: Add extra logging to `prompt_audit_events` for errors

**Implementation**:
- Include `SAFE_MODE=true` in audit event metadata when safe mode is enabled
- Log all errors with safe mode context

**Rules**:
- Non-blocking: Logging failures must not break requests
- Fail silently: If logging fails, continue with request

---

## SAFE MODE POLICY (MVP - Minimal)

**What Safe Mode Does**:
1. ✅ Reduces rate limits for high-cost routes (50% reduction)
2. ✅ Enforces internal-only endpoints (even if flag is off)
3. ✅ Enhances error logging (includes safe mode context)

**What Safe Mode Does NOT Do**:
- ❌ No new queues
- ❌ No provider switching
- ❌ No prompt content changes
- ❌ No model selection changes
- ❌ No blocking of public routes

---

## ACTIVATION WORKFLOW

### Step 1: Detect Incident

**Trigger**: RED alerts in `/admin/prompt-health` dashboard

**Action**: Review alerts and determine if safe mode is needed

---

### Step 2: Enable Safe Mode

**Action**: Set `SAFE_MODE=true` in Vercel environment variables

**Location**: Vercel Dashboard → Project Settings → Environment Variables

**Time**: Takes effect immediately (no deployment needed)

---

### Step 3: Monitor

**Action**: Monitor `/admin/prompt-health` dashboard

**Check**:
- Incident events created
- Rate limit effectiveness
- Error rates
- User impact

---

### Step 4: Resolve Incident

**Action**: 
1. Fix root cause
2. Mark incident as resolved
3. Set `SAFE_MODE=false` in Vercel

**Time**: Takes effect immediately

---

## DEACTIVATION

**Immediate**: Set `SAFE_MODE=false` in Vercel

**Effect**: All safe mode behaviors disabled instantly

**Risk**: MINIMAL - Default is `false` (non-breaking)

---

## INCIDENT RECORDING

**Automatic**: RED alerts automatically create incident events

**Deduplication**: Incidents deduplicated within 30-60 minutes

**Storage**: `incident_events` table

**Access**: `/admin/prompt-health` dashboard

---

## EXAMPLES

### Example 1: High Error Rate

**Scenario**: EP-03 shows 25% error rate (RED alert)

**Action**:
1. RED alert triggers incident event
2. Enable `SAFE_MODE=true`
3. Rate limits tightened for EP-03
4. Monitor error rates
5. Fix root cause
6. Disable safe mode

---

### Example 2: Provider Error Spike

**Scenario**: Provider/model shows 15 errors in 1 hour (RED alert)

**Action**:
1. RED alert triggers incident event
2. Enable `SAFE_MODE=true`
3. Rate limits tightened for affected routes
4. Monitor provider errors
5. Investigate provider issue
6. Disable safe mode

---

## BEST PRACTICES

1. **Use sparingly**: Only enable during actual incidents
2. **Monitor closely**: Check dashboard frequently when enabled
3. **Document incidents**: Add resolution notes when resolving
4. **Test locally**: Test safe mode behavior before production use
5. **Fail open**: If safe mode breaks, disable immediately

---

## TROUBLESHOOTING

### Safe Mode Not Working

**Cause**: `SAFE_MODE` not set to `true`

**Fix**: Verify environment variable is set correctly

---

### Rate Limits Too Strict

**Cause**: Safe mode reduces limits by 50%

**Fix**: 
1. Disable safe mode temporarily
2. Adjust rate limit reduction percentage (future enhancement)
3. Or disable safe mode rate limit reduction (future enhancement)

---

### Internal Routes Blocked

**Cause**: Safe mode enforces internal-only endpoints

**Fix**: Ensure `x-sselfie-internal` header is included in requests

---

**Last Updated**: 2026-01-17  
**Status**: ✅ Policy defined
