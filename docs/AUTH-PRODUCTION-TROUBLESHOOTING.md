# Authentication Production Troubleshooting Guide

## Issue: Login Works in Preview but Not Production

### Root Causes Identified:

1. **Cookie Persistence Issues**
   - Production HTTPS requires `Secure` flag on cookies
   - `SameSite` attribute must be set correctly for cross-origin requests
   - Cookie `path` must be `/` to work across all routes

2. **Supabase Configuration**
   - Production domain must be whitelisted in Supabase redirect URLs
   - Environment variables must be browser-accessible (`NEXT_PUBLIC_*`)

3. **Timing Issues**
   - Cookies may not be persisted immediately after login
   - Redirects happening before cookies are set

### Fixes Applied:

1. **Enhanced Cookie Options** (`lib/supabase/middleware.ts`):
   \`\`\`typescript
   const enhancedOptions = {
     ...options,
     path: options?.path || "/",
     sameSite: (options?.sameSite as "lax" | "strict" | "none" | undefined) || "lax",
     secure: process.env.NODE_ENV === "production" || (options?.secure ?? false),
     domain: options?.domain || undefined,
   }
   \`\`\`

2. **Session Verification Before Redirect** (`app/auth/login/page.tsx`):
   - Added 500ms delay to allow cookies to persist
   - Verify session exists before redirecting
   - Use `window.location.href` instead of `router.push()` to force full page reload

3. **Better Error Messages**:
   - Production-specific error handling
   - Clear user feedback for common issues

4. **Health Check Endpoint** (`app/api/auth/health/route.ts`):
   - Test Supabase connectivity
   - Verify environment variables
   - Check authentication status

### Verification Steps:

1. **Check Supabase Dashboard**:
   - Go to Authentication → URL Configuration
   - Add your production domain to "Redirect URLs":
     - `https://yourdomain.com/auth/callback`
     - `https://yourdomain.com`

2. **Verify Environment Variables** (Vercel Dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL` - Must be set
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Must be set
   - Both must be accessible to the browser

3. **Test Health Endpoint**:
   \`\`\`bash
   curl https://yourdomain.com/api/auth/health
   \`\`\`
   
   Should return:
   \`\`\`json
   {
     "status": "ok",
     "authenticated": false,
     "environment": {
       "hasSupabaseUrl": true,
       "hasSupabaseAnonKey": true,
       "nodeEnv": "production"
     }
   }
   \`\`\`

4. **Check Browser Console After Login**:
   - Look for `[v0]` debug logs
   - Verify "Session after login: ✅ Persisted"
   - Check cookie list in DevTools (Application → Cookies)
   - Should see `sb-access-token` and `sb-refresh-token`

### Common Production Issues:

**Issue**: Cookies not being set
- **Cause**: Missing `Secure` flag or wrong `SameSite` attribute
- **Fix**: Applied in middleware - cookies now use `secure: true` in production

**Issue**: Session lost after redirect
- **Cause**: Cookies not persisted before navigation
- **Fix**: Added 500ms delay + session verification + full page reload

**Issue**: "Network error" or CORS issues
- **Cause**: Supabase project not configured for production domain
- **Fix**: Add domain to Supabase dashboard redirect URLs

**Issue**: User data not syncing to Neon
- **Cause**: Webhook or sync function not triggered
- **Fix**: Check `/app/auth/callback/route.ts` - ensures `syncUserWithNeon()` is called

### Monitoring in Production:

After deploying, monitor these logs:
- `[v0] Login successful for: user@example.com`
- `[v0] Session after login: ✅ Persisted`
- `[v0] [Middleware] Authenticated user: { email: ... }`

If you see:
- `[v0] ❌ CRITICAL: Session not persisted in cookies!`
- This indicates cookie configuration issue - check browser DevTools for blocked cookies

### Last Resort Debugging:

If login still fails after all fixes:

1. **Check Supabase Logs** (Supabase Dashboard → Logs):
   - Look for authentication attempts
   - Check for rate limiting or API errors

2. **Verify Network Tab**:
   - Check if `signInWithPassword` API call succeeds (200 status)
   - Verify `Set-Cookie` headers are present in response
   - Check if subsequent requests include cookies

3. **Test with cURL**:
   \`\`\`bash
   # Login and capture cookies
   curl -v -X POST https://yourdomain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}' \
     -c cookies.txt
   
   # Verify session with cookies
   curl -v https://yourdomain.com/api/auth/health \
     -b cookies.txt
   \`\`\`

## Production Deployment Checklist:

- [ ] Add production domain to Supabase redirect URLs
- [ ] Verify `NEXT_PUBLIC_*` env vars are set in Vercel
- [ ] Deploy changes from this fix
- [ ] Test login flow in production
- [ ] Check `/api/auth/health` endpoint
- [ ] Monitor authentication logs
- [ ] Remove `[v0]` debug logs once stable (optional)

---

**Status**: Ready for production deployment with enhanced authentication
**Last Updated**: January 2025
