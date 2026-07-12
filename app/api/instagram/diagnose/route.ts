import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/client'

const FACEBOOK_APP_ID = process.env.INSTAGRAM_APP_ID || '1210263417166165'
const INSTAGRAM_LOGIN_APP_ID = process.env.INSTAGRAM_LOGIN_APP_ID
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

// Admin-only diagnostic endpoint - shows exactly what's configured and what's broken
export async function GET(request: NextRequest) {
  // Simple admin guard - only accessible if you know the secret or from admin context
  const authHeader = request.headers.get('x-admin-secret')
  const isLocalDev = process.env.VERCEL_ENV === undefined

  if (!isLocalDev && authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: Record<string, { status: 'ok' | 'missing' | 'error'; detail: string }> = {}

  // 1. Check env vars
  checks.INSTAGRAM_APP_ID = FACEBOOK_APP_ID
    ? { status: 'ok', detail: FACEBOOK_APP_ID }
    : { status: 'missing', detail: 'Not set - using hardcoded fallback 1210263417166165' }

  checks.INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET
    ? { status: 'ok', detail: 'Set (hidden)' }
    : { status: 'missing', detail: 'CRITICAL: Not set in environment' }

  checks.INSTAGRAM_LOGIN_APP_ID = INSTAGRAM_LOGIN_APP_ID
    ? { status: 'ok', detail: INSTAGRAM_LOGIN_APP_ID }
    : {
        status: 'missing',
        detail:
          'Required for the preferred Instagram Login path. Set this to the App ID from Meta’s Instagram Login / Instagram API setup.',
      }

  checks.INSTAGRAM_LOGIN_APP_SECRET = process.env.INSTAGRAM_LOGIN_APP_SECRET
    ? { status: 'ok', detail: 'Set (hidden)' }
    : {
        status: 'missing',
        detail:
          'Required for the preferred Instagram Login path. Set this to the secret for the same Instagram Login app.',
      }

  checks.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
    ? { status: 'ok', detail: process.env.NEXT_PUBLIC_SITE_URL }
    : { status: 'missing', detail: 'Not set' }

  // 2. What redirect URI the app will use
  checks.redirect_uri = { status: 'ok', detail: REDIRECT_URI }
  checks.redirect_uri_note = {
    status: 'ok',
    detail: `This exact URL must be in Meta App OAuth redirect settings for the selected login product`,
  }

  // 3. What scope the app requests
  const facebookScope = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'business_management',
    'instagram_manage_insights',
    'read_insights',
  ]
  const instagramLoginScope = [
    'instagram_business_basic',
    'instagram_business_manage_insights',
    'instagram_business_content_publish',
  ].join(', ')
  checks.requested_scope = {
    status: 'ok',
    detail: `Instagram Login: ${instagramLoginScope}. Facebook Page fallback: ${facebookScope.join(', ')}`,
  }
  checks.page_selection = {
    status: 'ok',
    detail: 'Preferred path is Instagram Login with IGAA tokens. Facebook Page selection remains as a legacy fallback.',
  }

  // 4. Check DB for existing connections
  try {
    const connections = await sql`
      SELECT instagram_username, account_type, is_active, token_expires_at, connected_at, last_synced_at
      FROM instagram_connections
      ORDER BY created_at DESC
      LIMIT 5
    `
    checks.db_connections = {
      status: connections.length > 0 ? 'ok' : 'missing',
      detail: connections.length > 0
        ? `${connections.length} connection(s): ${connections.map((c: any) => `@${c.instagram_username} (${c.is_active ? 'active' : 'inactive'}, expires ${c.token_expires_at ? new Date(c.token_expires_at).toLocaleDateString() : 'unknown'})`).join(', ')}`
        : 'No Instagram connections saved - OAuth has never completed successfully',
    }
  } catch (e: any) {
    checks.db_connections = { status: 'error', detail: `DB error: ${e.message}` }
  }

  // 5. Meta app URL for Sandra to verify settings
  const metaAppIdForLinks = INSTAGRAM_LOGIN_APP_ID || FACEBOOK_APP_ID
  const metaAppUrl = `https://developers.facebook.com/apps/${metaAppIdForLinks}/settings/basic/`
  const metaLoginUrl = `https://developers.facebook.com/apps/${metaAppIdForLinks}/use_cases/customize/`

  return NextResponse.json({
    summary: 'Instagram Integration Diagnostic',
    checks,
    action_required: {
      step1: `Go to Meta for Developers: ${metaAppUrl}`,
      step2: `Confirm the Instagram Login / Instagram API setup uses this App ID and add this EXACT callback URL where Meta asks for OAuth redirect URIs: ${metaLoginUrl}`,
      redirect_uri_to_add: REDIRECT_URI,
      step3: 'Reconnect from the SSELFIE admin Connect Instagram button. It now uses Instagram Login.',
      step4: 'If app is in Development Mode, add your Instagram account as a Tester in App Roles',
    },
  })
}
