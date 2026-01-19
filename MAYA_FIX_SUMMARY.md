# Maya Fix Summary - Payload Too Large Error

## Root Cause Identified ✅

**Error:** `Payload Too Large` (HTTP 413) from Anthropic API  
**Location:** `app/api/maya/chat/route.ts`  
**Actual Issue:** User context was **41,951,057 characters** (40MB) - way too large for API

### Why This Happened

1. **Corrupted Personal Brand Data**: The database contains corrupted JSON with excessive escaped backslashes (`\\\\\\...`)
2. **No Size Validation**: The context builder had no size limits
3. **Redis Cache Failure**: Corrupted data caused Redis caching to fail, but the code continued
4. **No Truncation**: Large/corrupted fields were included in full

## Fixes Applied ✅

### 1. Context Size Limiting (`lib/maya/get-user-context.ts`)
- Added **50KB maximum context size** (conservative limit)
- Priority-based truncation: keeps important sections (user info, physical preferences, brand colors) first
- Truncates less important sections if needed

### 2. Data Validation (`lib/maya/get-user-context.ts`)
- Detects corrupted fields (excessive backslashes, extremely large strings)
- Skips corrupted fields instead of including them
- Validates each field before adding to context
- Safe field extraction with length limits

### 3. Redis Cache Protection (`lib/data/maya.ts`)
- Validates data before caching to prevent Redis errors
- Gracefully handles cache failures (non-fatal)
- Skips caching corrupted data

### 4. API-Level Safety Check (`app/api/maya/chat/route.ts`)
- Additional size validation before sending to Anthropic
- Truncates context if somehow still too large
- Prevents "Payload Too Large" errors at the API level

## Testing Recommendations

1. **Test with the corrupted user account** that was causing the issue
2. **Verify context size** is now under 50KB
3. **Check logs** for corruption warnings
4. **Test concept generation** to ensure it works now

## Next Steps (Optional)

1. **Clean up corrupted data** in the database:
   ```sql
   -- Find users with corrupted personal brand data
   SELECT user_id, 
          LENGTH(visual_aesthetic::text) as visual_aesthetic_length,
          LENGTH(settings_preference::text) as settings_length
   FROM user_personal_brand
   WHERE LENGTH(visual_aesthetic::text) > 10000
      OR LENGTH(settings_preference::text) > 10000;
   ```

2. **Fix corrupted records** by re-saving them or clearing corrupted fields

3. **Monitor context sizes** using the health endpoint:
   ```bash
   GET /api/admin/maya-health
   ```

## Files Modified

1. `lib/maya/get-user-context.ts` - Added size limits and validation
2. `lib/data/maya.ts` - Added Redis cache validation
3. `app/api/maya/chat/route.ts` - Added API-level safety check

## Expected Behavior Now

- ✅ Context size limited to 50KB max
- ✅ Corrupted fields are skipped (not included)
- ✅ Important sections prioritized during truncation
- ✅ Redis cache failures handled gracefully
- ✅ API requests should succeed (no more 413 errors)
