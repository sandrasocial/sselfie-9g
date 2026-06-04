import { NextRequest, NextResponse } from 'next/server'


const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '1210263417166165'
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

function shouldUseInstagramLogin(provider?: string | null) {
  const resolved = provider || process.env.INSTAGRAM_CONNECT_PROVIDER || ""
  return ["instagram", "instagram_login", "instagram_business_login"].includes(resolved.trim().toLowerCase())
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const provider = searchParams.get('provider')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!INSTAGRAM_APP_SECRET) {
      return NextResponse.json({ error: 'Instagram App Secret not configured' }, { status: 500 })
    }

    if (shouldUseInstagramLogin(provider)) {
      const scope = (
        process.env.INSTAGRAM_LOGIN_SCOPES ||
        [
          'instagram_business_basic',
          'instagram_business_manage_messages',
          'instagram_business_manage_comments',
          'instagram_business_manage_insights',
          'instagram_business_content_publish',
        ].join(',')
      )

      const authUrl = new URL('https://www.instagram.com/oauth/authorize')
      authUrl.searchParams.append('client_id', INSTAGRAM_APP_ID)
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
      authUrl.searchParams.append('scope', scope)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('state', `instagram_login:${userId}`)

      console.log('[v0] Instagram OAuth URL (Instagram Login):', {
        authUrl: authUrl.toString(),
        redirectUri: REDIRECT_URI,
        scope,
      })

      return NextResponse.json({ authUrl: authUrl.toString(), provider: 'instagram_login' })
    }

    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'business_management',
      ...(process.env.INSTAGRAM_CONNECT_MESSAGING_SCOPES_ENABLED === 'true'
        ? ['pages_messaging', 'instagram_manage_messages', 'instagram_manage_comments']
        : []),
    ].join(',')

    // Build URL with proper Instagram API Onboarding channel
    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
    authUrl.searchParams.append('client_id', INSTAGRAM_APP_ID)
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.append('scope', scope)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('state', userId)
    authUrl.searchParams.append('display', 'page')

    console.log('[v0] Instagram OAuth URL (Standard Access):', { authUrl: authUrl.toString(), redirectUri: REDIRECT_URI, scope })

    return NextResponse.json({ authUrl: authUrl.toString(), provider: 'facebook_page' })
  } catch (error) {
    console.error('[Instagram Connect Error]:', error)
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}
