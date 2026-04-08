# Production Environment Variables Checklist

**CRITICAL: AI_GATEWAY_API_KEY Missing**

The following error occurred in production:
\`\`\`
AI Gateway authentication failed: Invalid API key.
Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.
\`\`\`

## Required Action

1. Go to: https://vercel.com/sselfie-studio/v0-sselfie/settings/environment-variables
2. Verify `AI_GATEWAY_API_KEY` is set and not expired
3. If missing or invalid, create a new API key at: https://vercel.com/[team]/~/ai/api-keys
4. Add the API key to production environment variables
5. Redeploy the application

## All Required Environment Variables

### Authentication (Supabase)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Database (Neon)
- ✅ `DATABASE_URL`
- ✅ `POSTGRES_URL`

### AI Services
- ❌ `AI_GATEWAY_API_KEY` - **MISSING OR INVALID**
- ✅ `ANTHROPIC_API_KEY` (fallback)
- ✅ `OPENAI_API_KEY` (fallback)

### Image Generation (Replicate)
- ✅ `REPLICATE_API_TOKEN`

### Payments (Stripe)
- ✅ `STRIPE_SECRET_KEY`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`

### Storage (Vercel Blob)
- ✅ `BLOB_READ_WRITE_TOKEN`

### Cache (Upstash)
- ✅ `UPSTASH_KV_REST_API_URL`
- ✅ `UPSTASH_KV_REST_API_TOKEN`

## CSP Domains Allowed

All external service domains have been added to Content Security Policy:
- Supabase: `https://*.supabase.co`
- Replicate: `https://*.replicate.com`, `https://replicate.delivery`
- Stripe: `https://*.stripe.com`
- Vercel Blob: `https://*.blob.vercel-storage.com`
- AI Gateway: `https://ai-gateway.vercel.sh`, `https://*.vercel.sh`
- Upstash: `https://*.upstash.io`
- Neon: `https://*.neon.tech`

## Next Steps

1. Fix the `AI_GATEWAY_API_KEY` issue immediately
2. Redeploy to production
3. Test Maya chat functionality
4. Verify all external service calls work correctly
