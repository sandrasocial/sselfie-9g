import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import {
  selectPageWithInstagramAccount,
  type FacebookPageCandidate,
} from "@/lib/instagram/page-selection"


const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "1210263417166165"
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`
const PREFERRED_INSTAGRAM_USERNAMES = [
  process.env.INSTAGRAM_PREFERRED_USERNAME,
  process.env.INSTAGRAM_TARGET_USERNAME,
  "sandra.social",
  "ssasocial",
  "sselfie",
].filter(Boolean) as string[]

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
    const expiresIn = Number(longLivedData.expires_in) || 60 * 24 * 60 * 60
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    console.log("[Instagram Callback] Long-lived token obtained, fetching Facebook Pages")

    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${accessToken}`,
    )
    const pagesData = await pagesResponse.json()

    console.log(
      "[Instagram Callback] Pages response summary:",
      JSON.stringify({
        count: pagesData.data?.length || 0,
        pages: pagesData.data?.map((page: FacebookPageCandidate) => ({
          id: page.id,
          name: page.name,
          hasInstagram: Boolean(page.instagram_business_account?.id),
          instagramUsername: page.instagram_business_account?.username || null,
        })),
      }),
    )

    if (pagesData.error) {
      console.error("[Instagram Callback] Pages fetch failed:", JSON.stringify(pagesData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=pages_fetch_failed&detail=${encodeURIComponent(pagesData.error.message || "unknown")}`)
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error("[Instagram Callback] No Facebook Pages found for this account")
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=no_facebook_page&detail=No+Facebook+Page+found.+Your+Instagram+must+be+linked+to+a+Facebook+Page.`)
    }

    let selectedPage = selectPageWithInstagramAccount(pagesData.data, PREFERRED_INSTAGRAM_USERNAMES)

    if (!selectedPage) {
      for (const page of pagesData.data as FacebookPageCandidate[]) {
        if (!page.id) continue

        const pageToken = page.access_token || accessToken
        const igResponse = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${pageToken}`,
        )
        const igData = await igResponse.json()

        if (igData.error) {
          console.error(
            "[Instagram Callback] Instagram account fetch failed for page:",
            page.name,
            JSON.stringify(igData.error),
          )
          continue
        }

        if (igData.instagram_business_account?.id) {
          const candidates = [
            ...(selectedPage ? [selectedPage] : []),
            {
              ...page,
              instagram_business_account: igData.instagram_business_account,
            },
          ]
          selectedPage = selectPageWithInstagramAccount(candidates, PREFERRED_INSTAGRAM_USERNAMES)
          break
        }
      }
    }

    if (!selectedPage?.instagram_business_account?.id) {
      const pageNames = pagesData.data
        .map((page: FacebookPageCandidate) => page.name)
        .filter(Boolean)
        .join(", ")

      console.error("[Instagram Callback] No Instagram Business Account found on granted pages:", pageNames)
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=no_instagram_account&detail=${encodeURIComponent(`No linked Instagram Professional Account found on granted Facebook Pages. Checked: ${pageNames || "none"}.`)}`)
    }

    const pageName = selectedPage.name || "selected page"
    const instagramUserId = selectedPage.instagram_business_account.id
    const pageAccessToken = selectedPage.access_token || accessToken
    console.log("[Instagram Callback] Facebook Page with Instagram found:", pageName, selectedPage.id)

    const profileResponse = await fetch(
      `https://graph.facebook.com/v21.0/${instagramUserId}?fields=username&access_token=${pageAccessToken}`,
    )
    const profileData = await profileResponse.json()

    if (profileData.error) {
      console.error("[Instagram Callback] Profile fetch failed:", JSON.stringify(profileData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=profile_fetch_failed&detail=${encodeURIComponent(profileData.error.message || "unknown")}`)
    }

    console.log("[Instagram Callback] Instagram profile fetched:", profileData.username)

    await sql`
      INSERT INTO instagram_connections (user_id, instagram_username, instagram_user_id, access_token, token_expires_at, account_type)
      VALUES (${userId}, ${profileData.username}, ${instagramUserId}, ${accessToken}, ${expiresAt.toISOString()}, ${"business"})
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
