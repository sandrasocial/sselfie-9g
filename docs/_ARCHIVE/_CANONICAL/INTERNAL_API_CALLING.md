# INTERNAL API CALLING GUIDE

**Last Updated**: 2026-01-17 (Phase 5C)  
**Purpose**: How to call internal-only endpoints safely  
**Audience**: Backend developers, internal tools, admin scripts

---

## OVERVIEW

Internal-only endpoints require a special header (`x-sselfie-internal`) to authenticate requests. This prevents external access while allowing internal systems to call these endpoints.

**Enforcement**: Controlled by `ENFORCE_INTERNAL_ONLY_ENDPOINTS` environment variable (default: `false` - non-breaking)

---

## HEADER FORMAT

**Header Name**: `x-sselfie-internal`  
**Header Value**: Value of `INTERNAL_API_SECRET` environment variable

**Example**:
```bash
x-sselfie-internal: your-secret-value-here
```

---

## ENVIRONMENT VARIABLES

### Required (when enforcement enabled)

**`INTERNAL_API_SECRET`**
- **Purpose**: Secret value for internal API authentication
- **Location**: Vercel environment variables
- **Format**: Any secure string (recommended: random UUID or long random string)
- **Security**: Treat as secret, never commit to git

**`ENFORCE_INTERNAL_ONLY_ENDPOINTS`**
- **Purpose**: Enable/disable internal-only enforcement
- **Values**: `true` (enforce) or `false` (allow all, default)
- **Default**: `false` (non-breaking)

### Optional (admin routes)

**`ENFORCE_ADMIN_ONLY_ENDPOINTS`**
- **Purpose**: Enable/disable admin-only enforcement
- **Values**: `true` (enforce, default) or `false` (allow all)
- **Default**: `true` (admin routes enforced by default)

---

## EXAMPLE CURL COMMANDS

### Calling Internal Endpoint (Local)

```bash
# Set secret (replace with actual secret)
export INTERNAL_SECRET="your-secret-value"

# Call internal endpoint
curl -X POST http://localhost:3000/api/maya/generate-prompt-suggestions \
  -H "Content-Type: application/json" \
  -H "x-sselfie-internal: $INTERNAL_SECRET" \
  -d '{
    "workbenchImages": [],
    "userIntent": "Create engaging Instagram content",
    "contentType": "custom"
  }'
```

### Calling Internal Endpoint (Production)

```bash
# Set secret from Vercel (replace with actual secret)
export INTERNAL_SECRET="your-production-secret"

# Call internal endpoint
curl -X POST https://your-domain.com/api/maya/generate-prompt-suggestions \
  -H "Content-Type: application/json" \
  -H "x-sselfie-internal: $INTERNAL_SECRET" \
  -d '{
    "workbenchImages": [],
    "userIntent": "Create engaging Instagram content",
    "contentType": "custom"
  }'
```

---

## TESTING LOCALLY

### Step 1: Set Environment Variables

**`.env.local`**:
```bash
ENFORCE_INTERNAL_ONLY_ENDPOINTS=true
INTERNAL_API_SECRET=test-secret-12345
```

### Step 2: Restart Dev Server

```bash
npm run dev
```

### Step 3: Test Without Header (Should Fail)

```bash
curl -X POST http://localhost:3000/api/maya/generate-prompt-suggestions \
  -H "Content-Type: application/json" \
  -d '{"workbenchImages": []}'
```

**Expected**: `403 Forbidden` with error message

### Step 4: Test With Header (Should Succeed)

```bash
curl -X POST http://localhost:3000/api/maya/generate-prompt-suggestions \
  -H "Content-Type: application/json" \
  -H "x-sselfie-internal: test-secret-12345" \
  -d '{"workbenchImages": []}'
```

**Expected**: `200 OK` with response data

---

## TESTING IN PRODUCTION

### Step 1: Enable Enforcement in Preview

**Vercel Dashboard** → **Project Settings** → **Environment Variables**:
- Set `ENFORCE_INTERNAL_ONLY_ENDPOINTS` to `true` (preview environment)
- Set `INTERNAL_API_SECRET` to a secure value (preview environment)

### Step 2: Verify App User Flows Still Work

**Test**: Use app normally (Maya chat, Feed Planner, etc.)

**Expected**: All user-facing features work (PUBLIC routes not affected)

### Step 3: Verify Internal Routes Reject Without Header

**Test**: Call internal endpoint without header

**Expected**: `403 Forbidden`

### Step 4: Verify Internal Routes Accept With Header

**Test**: Call internal endpoint with correct header

**Expected**: `200 OK` with response

### Step 5: Monitor Prompt Health Dashboard

**Check**: `/admin/prompt-health` for unexpected 401/403 spikes

**Expected**: No spikes (enforcement working correctly)

---

## INTERNAL ENDPOINTS

### Current Internal Routes

| Route | EP ID | Purpose | Enforcement |
|-------|-------|---------|-------------|
| `/api/maya/generate-prompt-suggestions` | EP-02 | Workbench prompt suggestions | ✅ Enabled (Phase 5C) |

---

## ADMIN ENDPOINTS

### Admin Route Pattern

All routes under `/api/admin/**` are admin-only.

**Authentication**: Uses existing admin auth (Supabase + user role check)

**Enforcement**: Controlled by `ENFORCE_ADMIN_ONLY_ENDPOINTS` (default: `true`)

**Example**:
```typescript
// Admin route handler
export async function GET(req: NextRequest) {
  // Admin auth check (existing pattern)
  const { user: authUser } = await getAuthenticatedUser()
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  // ... rest of handler
}
```

---

## SECURITY BEST PRACTICES

1. **Never commit secrets**: Keep `INTERNAL_API_SECRET` in environment variables only
2. **Use different secrets**: Use different secrets for preview/production
3. **Rotate secrets**: Rotate secrets periodically (e.g., quarterly)
4. **Monitor access**: Check prompt-health dashboard for unexpected access patterns
5. **Fail closed**: If secret not configured, enforcement fails open (logs warning)

---

## TROUBLESHOOTING

### 403 Forbidden (Internal Route)

**Cause**: Missing or incorrect `x-sselfie-internal` header

**Fix**: 
1. Check `INTERNAL_API_SECRET` is set in environment
2. Verify header value matches secret exactly
3. Check `ENFORCE_INTERNAL_ONLY_ENDPOINTS` is `true`

### 403 Forbidden (Admin Route)

**Cause**: Not authenticated as admin

**Fix**:
1. Verify admin authentication (Supabase + user role)
2. Check `ENFORCE_ADMIN_ONLY_ENDPOINTS` is `true` (default)

### Enforcement Not Working

**Cause**: `ENFORCE_INTERNAL_ONLY_ENDPOINTS` is `false` (default)

**Fix**: Set `ENFORCE_INTERNAL_ONLY_ENDPOINTS=true` in environment

---

## ROLLBACK PLAN

If enforcement causes issues:

1. **Immediate**: Set `ENFORCE_INTERNAL_ONLY_ENDPOINTS=false` in Vercel
2. **Verify**: Confirm app user flows work again
3. **Investigate**: Check prompt-health dashboard for root cause
4. **Fix**: Address issue before re-enabling enforcement

---

**Last Updated**: 2026-01-17  
**Status**: ✅ Documentation complete
