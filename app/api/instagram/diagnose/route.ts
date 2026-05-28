import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/client'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '1210263417166165'
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

// Admin-only diagnostic endpoint — shows exactly what's configured and what's broken
export async function GET(request: NextRequest) {
  // Simple admin guard — only accessible if you know the secret or from admin context
  const authHeader = request.headers.get('x-admin-secret')
  const isLocalDev = process.env.VERCEL_ENV === undefined

  if (!isLocalDev && authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: Record<string, { status: 'ok' | 'missing' | 'error'; detail: string }> = {}

  // 1. Check env vars
  checks.INSTAGRAM_APP_ID = INSTAGRAM_APP_ID
    ? { status: 'ok', detail: INSTAGRAM_APP_ID }
    : { status: 'missing', detail: 'Not set — using hardcoded fallback 1210263417166165' }

  checks.INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET
    ? { status: 'ok', detail: 'Set (hidden)' }
    : { status: 'missing', detail: 'CRITICAL: Not set in environment' }

  checks.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
    ? { status: 'ok', detail: process.env.NEXT_PUBLIC_SITE_URL }
    : { status: 'missing', detail: 'Not set' }

  // 2. What redirect URI the app will use
  checks.redirect_uri = { status: 'ok', detail: REDIRECT_URI }
  checks.redirect_uri_note = {
    status: 'ok',
    detail: `This exact URL must be in Meta App → Facebook Login → Valid OAuth Redirect URIs`,
  }

  // 3. What scope the app requests
  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'instagram_basic',
    'business_management',
  ]
  checks.requested_scope = { status: 'ok', detail: scope.join(', ') }
  checks.page_selection = {
    status: 'ok',
    detail: 'OAuth callback checks all granted Facebook Pages and selects the Page with a linked Instagram Professional Account.',
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
        : 'No Instagram connections saved — OAuth has never completed successfully',
    }
  } catch (e: any) {
    checks.db_connections = { status: 'error', detail: `DB error: ${e.message}` }
  }

  // 5. Meta app URL for Sandra to verify settings
  const metaAppUrl = `https://developers.facebook.com/apps/${INSTAGRAM_APP_ID}/settings/basic/`
  const metaLoginUrl = `https://developers.facebook.com/apps/${INSTAGRAM_APP_ID}/fb-login/settings/`

  return NextResponse.json({
    summary: 'Instagram Integration Diagnostic',
    checks,
    action_required: {
      step1: `Go to Meta for Developers: ${metaAppUrl}`,
      step2: `Add this EXACT URL to Valid OAuth Redirect URIs: ${metaLoginUrl}`,
      redirect_uri_to_add: REDIRECT_URI,
      step3: 'Make sure your Instagram account is linked to a Facebook Page (Instagram → Settings → Accounts Centre)',
      step4: 'If app is in Development Mode, add your Instagram account as a Tester in App Roles',
    },
  })
}
