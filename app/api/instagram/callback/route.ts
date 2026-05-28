import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"


const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "1210263417166165"
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const userId = searchParams.get("state")

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!code || !userId) {
      const metaError = new URL(request.url).searchParams.get("error_description") || "no_code_or_user"
      console.error("[Instagram Callback] Missing code or userId. Meta error:", metaError)
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=auth_failed&detail=${encodeURIComponent(metaError)}`)
    }

    console.log("[Instagram Callback] Exchanging code for token")

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${INSTAGRAM_APP_SECRET}&code=${code}`,
    )

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error("[Instagram Callback] Token exchange failed:", JSON.stringify(tokenData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=token_exchange_failed&detail=${encodeURIComponent(tokenData.error.message || tokenData.error.type || "unknown")}`)
    }

    const shortLivedToken = tokenData.access_token
    console.log("[Instagram Callback] Short-lived token obtained, exchanging for long-lived")

    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${INSTAGRAM_APP_ID}&client_secret=${INSTAGRAM_APP_SECRET}&fb_exchange_token=${shortLivedToken}`,
    )

    const longLivedData = await longLivedResponse.json()

    if (longLivedData.error) {
      console.error("[Instagram Callback] Long-lived token failed:", JSON.stringify(longLivedData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=long_lived_token_failed&detail=${encodeURIComponent(longLivedData.error.message || "unknown")}`)
    }

    const accessToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    console.log("[Instagram Callback] Long-lived token obtained, fetching Facebook Pages")

    const pagesResponse = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`)
    const pagesData = await pagesResponse.json()

    console.log("[Instagram Callback] Pages raw response:", JSON.stringify(pagesData))

    if (pagesData.error) {
      console.error("[Instagram Callback] Pages fetch failed:", JSON.stringify(pagesData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=pages_fetch_failed&detail=${encodeURIComponent(pagesData.error.message || "unknown")}`)
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error("[Instagram Callback] No Facebook Pages found for this account")
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=no_facebook_page&detail=No+Facebook+Page+found.+Your+Instagram+must+be+linked+to+a+Facebook+Page.`)
    }

    const pageId = pagesData.data[0].id
    const pageName = pagesData.data[0].name
    console.log("[Instagram Callback] Facebook Page found:", pageName, pageId)

    const igResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`,
    )
    const igData = await igResponse.json()

    if (!igData.instagram_business_account) {
      console.error("[Instagram Callback] No Instagram Business Account on page:", pageName)
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=no_instagram_account&detail=Facebook+Page+"${encodeURIComponent(pageName)}"+has+no+Instagram+Professional+Account+linked.`)
    }

    const instagramUserId = igData.instagram_business_account.id

    const profileResponse = await fetch(
      `https://graph.facebook.com/v21.0/${instagramUserId}?fields=username,account_type&access_token=${accessToken}`,
    )
    const profileData = await profileResponse.json()

    if (profileData.error) {
      console.error("[Instagram Callback] Profile fetch failed:", JSON.stringify(profileData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=profile_fetch_failed&detail=${encodeURIComponent(profileData.error.message || "unknown")}`)
    }

    console.log("[Instagram Callback] Instagram profile fetched:", profileData.username, profileData.account_type)

    await sql`
      INSERT INTO instagram_connections (user_id, instagram_username, instagram_user_id, access_token, token_expires_at, account_type)
      VALUES (${userId}, ${profileData.username}, ${instagramUserId}, ${accessToken}, ${expiresAt.toISOString()}, ${profileData.account_type?.toLowerCase() || "business"})
      ON CONFLICT (user_id, instagram_username)
      DO UPDATE SET
        access_token = ${accessToken},
        token_expires_at = ${expiresAt.toISOString()},
        is_active = true,
        updated_at = NOW()
    `

    console.log("[Instagram Callback] Connection saved for @", profileData.username)

    return NextResponse.redirect(`${baseUrl}/admin?ig_connected=${encodeURIComponent(profileData.username)}`)
  } catch (error) {
    console.error("[Instagram Callback] Unexpected error:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/admin?ig_error=unexpected&detail=${encodeURIComponent(String(error))}`)
  }
}
