import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-helper'
import { createInstagramOAuthState } from '@/lib/instagram/oauth-state'
import { getUserByAuthId } from '@/lib/user-mapping'

const FACEBOOK_APP_ID = process.env.INSTAGRAM_APP_ID || '1210263417166165'
const FACEBOOK_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const INSTAGRAM_LOGIN_APP_ID = process.env.INSTAGRAM_LOGIN_APP_ID
const INSTAGRAM_LOGIN_APP_SECRET = process.env.INSTAGRAM_LOGIN_APP_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

function shouldUseInstagramLogin(provider?: string | null) {
  const resolved = provider || process.env.INSTAGRAM_CONNECT_PROVIDER || ""
  return ["instagram", "instagram_login", "instagram_business_login"].includes(resolved.trim().toLowerCase())
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    // redirect=1: send the browser straight into Meta's OAuth dialog (used by the
    // admin Connect Instagram button, which is a plain link, not a fetch).
    const wantsRedirect = searchParams.get('redirect') === '1'

    // userId comes from the session, never from the query string — the callback
    // writes an instagram_connections row for this id, so it must be the caller's own.
    const { user: authUser } = await getAuthenticatedUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = neonUser.id

    const requestedUserId = searchParams.get('userId')
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: 'userId does not match the signed-in user' }, { status: 403 })
    }

    if (!FACEBOOK_APP_SECRET) {
      return NextResponse.json({ error: 'Instagram App Secret not configured' }, { status: 500 })
    }

    if (shouldUseInstagramLogin(provider)) {
      if (!INSTAGRAM_LOGIN_APP_ID) {
        return NextResponse.json(
          {
            error: 'Instagram Login App ID not configured',
            detail:
              'Set INSTAGRAM_LOGIN_APP_ID in Vercel Production to the App ID from Meta’s Instagram Login / Instagram API setup. The Facebook app id cannot be used for this Instagram OAuth path.',
          },
          { status: 500 },
        )
      }

      if (INSTAGRAM_LOGIN_APP_ID === FACEBOOK_APP_ID) {
        return NextResponse.json(
          {
            error: 'Instagram Login App ID is not an Instagram platform app',
            detail:
              'The configured INSTAGRAM_LOGIN_APP_ID matches the Facebook app id. Use the admin Connect Instagram button without provider=instagram until Meta has a dedicated Instagram Login app id.',
          },
          { status: 500 },
        )
      }

      if (!INSTAGRAM_LOGIN_APP_SECRET) {
        return NextResponse.json(
          {
            error: 'Instagram Login App Secret not configured',
            detail:
              'Set INSTAGRAM_LOGIN_APP_SECRET in Vercel Production to the app secret for the same Instagram Login app.',
          },
          { status: 500 },
        )
      }

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
      authUrl.searchParams.append('client_id', INSTAGRAM_LOGIN_APP_ID)
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
      authUrl.searchParams.append('scope', scope)
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('state', createInstagramOAuthState('instagram_login', userId))

      console.log('[v0] Instagram OAuth URL (Instagram Login):', {
        authUrl: authUrl.toString(),
        redirectUri: REDIRECT_URI,
        scope,
      })

      if (wantsRedirect) return NextResponse.redirect(authUrl.toString())
      return NextResponse.json({ authUrl: authUrl.toString(), provider: 'instagram_login' })
    }

    const scope = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'business_management',
      'pages_messaging',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'instagram_manage_insights',
      'read_insights',
    ].join(',')

    // Build URL with proper Instagram API Onboarding channel
    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
    authUrl.searchParams.append('client_id', FACEBOOK_APP_ID)
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.append('scope', scope)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('state', createInstagramOAuthState('facebook_page', userId))
    authUrl.searchParams.append('display', 'page')

    console.log('[v0] Instagram OAuth URL (Standard Access):', { authUrl: authUrl.toString(), redirectUri: REDIRECT_URI, scope })

    if (wantsRedirect) return NextResponse.redirect(authUrl.toString())
    return NextResponse.json({ authUrl: authUrl.toString(), provider: 'facebook_page' })
  } catch (error) {
    console.error('[Instagram Connect Error]:', error)
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}
