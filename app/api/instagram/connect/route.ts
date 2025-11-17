import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '1210263417166165'
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!INSTAGRAM_APP_SECRET) {
      return NextResponse.json({ error: 'Instagram App Secret not configured' }, { status: 500 })
    }

    // These permissions work in Development Mode for testers
    const scope = [
      'pages_show_list',
      'pages_read_engagement',
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

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error('[Instagram Connect Error]:', error)
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}
