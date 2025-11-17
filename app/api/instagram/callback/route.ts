import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '1210263417166165'
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const userId = searchParams.get('state')

    if (!code || !userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?error=instagram_auth_failed`)
    }

    console.log('[v0] Instagram callback - exchanging code for token via Facebook Graph API')

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${INSTAGRAM_APP_SECRET}&code=${code}`
    )

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('[Facebook Token Error]:', tokenData)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?error=token_exchange_failed`)
    }

    const shortLivedToken = tokenData.access_token

    console.log('[v0] Short-lived token obtained, exchanging for long-lived token')

    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${INSTAGRAM_APP_ID}&client_secret=${INSTAGRAM_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
    )

    const longLivedData = await longLivedResponse.json()

    if (longLivedData.error) {
      console.error('[Facebook Long-Lived Token Error]:', longLivedData)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?error=long_lived_token_failed`)
    }

    const accessToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    console.log('[v0] Long-lived token obtained, fetching Facebook Pages')

    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
    )
    const pagesData = await pagesResponse.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('[Instagram Error]: No Facebook Pages found')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?error=no_facebook_page`)
    }

    const pageId = pagesData.data[0].id
    console.log('[v0] Facebook Page found, fetching Instagram Business Account')

    const igResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    )
    const igData = await igResponse.json()

    if (!igData.instagram_business_account) {
      console.error('[Instagram Error]: No Instagram Business Account connected to Facebook Page')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?error=no_instagram_account`)
    }

    const instagramUserId = igData.instagram_business_account.id

    const profileResponse = await fetch(
      `https://graph.facebook.com/v21.0/${instagramUserId}?fields=username,account_type&access_token=${accessToken}`
    )
    const profileData = await profileResponse.json()

    console.log('[v0] Instagram profile fetched:', profileData)

    await sql`
      INSERT INTO instagram_connections (user_id, instagram_username, instagram_user_id, access_token, token_expires_at, account_type)
      VALUES (${userId}, ${profileData.username}, ${instagramUserId}, ${accessToken}, ${expiresAt.toISOString()}, ${profileData.account_type?.toLowerCase() || 'business'})
      ON CONFLICT (user_id, instagram_username) 
      DO UPDATE SET 
        access_token = ${accessToken},
        token_expires_at = ${expiresAt.toISOString()},
        is_active = true,
        updated_at = NOW()
    `

    console.log('[v0] Instagram connection saved to database')

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?instagram_connected=true`)
  } catch (error) {
    console.error('[Instagram Callback Error]:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin/agent?error=instagram_connection_failed`)
  }
}
