import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { verifyInstagramOAuthState } from "@/lib/instagram/oauth-state"
import {
  selectPageWithInstagramAccount,
  type FacebookPageCandidate,
} from "@/lib/instagram/page-selection"


// trim() defuses pasted trailing newlines/spaces in Vercel env values - a literal
// "\n" in an env var has silently broken auth here before (APP_V3_PORTRAIT_SIZE incident).
const FACEBOOK_APP_ID = (process.env.INSTAGRAM_APP_ID || "1210263417166165").trim()
const FACEBOOK_APP_SECRET = (process.env.INSTAGRAM_APP_SECRET || "").trim()
const INSTAGRAM_LOGIN_APP_ID = (process.env.INSTAGRAM_LOGIN_APP_ID || "").trim()
const INSTAGRAM_LOGIN_APP_SECRET = (process.env.INSTAGRAM_LOGIN_APP_SECRET || "").trim()
// Must exactly match the connect route's REDIRECT_URI - see the comment there.
const REDIRECT_URI = (
  process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`
).trim()
const PREFERRED_INSTAGRAM_USERNAMES = [
  process.env.INSTAGRAM_PREFERRED_USERNAME,
  process.env.INSTAGRAM_TARGET_USERNAME,
  "sandra.social",
  "ssasocial",
  "sselfie",
].filter(Boolean) as string[]

// State must carry a valid HMAC issued by /api/instagram/connect (session-authed).
// A missing or forged state yields userId null, which the handler rejects - nobody
// can attach a connection to an arbitrary userId by crafting the redirect.
function parseOAuthState(rawState?: string | null) {
  const verified = verifyInstagramOAuthState(rawState)
  if (!verified) return { provider: "facebook_page" as const, userId: null }
  return { provider: verified.provider, userId: verified.userId }
}

async function exchangeInstagramLoginCode(code: string) {
  if (!INSTAGRAM_LOGIN_APP_ID || !INSTAGRAM_LOGIN_APP_SECRET) {
    throw new Error("Instagram Login app id/secret are not configured in Vercel")
  }

  const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: INSTAGRAM_LOGIN_APP_ID,
      client_secret: INSTAGRAM_LOGIN_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code,
    }),
  })
  const tokenData = await tokenResponse.json()

  // api.instagram.com reports failures as {error_type, code, error_message}, NOT
  // {error: {...}} - checking only .error swallowed the real reason behind a
  // generic message. NOTE 2026-07-09: this dialog also has a live, unresolved
  // Meta bug - it can reject a fresh, single-use code with "Error validating
  // verification code" even with a proven-correct secret/redirect_uri/tester
  // status. If this recurs, use Meta's "Generate access tokens" panel (API
  // setup with Instagram login, step 2) to mint a token directly instead of
  // fighting the dialog - see instagram-manual-connect memory for the pattern.
  if (tokenData.error || tokenData.error_type || tokenData.error_message) {
    const reason =
      tokenData.error_message ||
      tokenData.error?.message ||
      tokenData.error_type ||
      "Instagram Login token exchange failed"
    throw new Error(reason)
  }

  const shortLivedToken = tokenData.access_token as string | undefined
  if (!shortLivedToken) {
    throw new Error("Instagram Login did not return an access token")
  }

  const longLivedUrl = new URL("https://graph.instagram.com/access_token")
  longLivedUrl.searchParams.set("grant_type", "ig_exchange_token")
  longLivedUrl.searchParams.set("client_secret", INSTAGRAM_LOGIN_APP_SECRET)
  longLivedUrl.searchParams.set("access_token", shortLivedToken)

  const longLivedResponse = await fetch(longLivedUrl.toString())
  const longLivedData = await longLivedResponse.json()

  if (longLivedData.error) {
    throw new Error(longLivedData.error?.message || "Instagram Login long-lived token exchange failed")
  }

  const accessToken = (longLivedData.access_token || shortLivedToken) as string
  const expiresIn = Number(longLivedData.expires_in) || 60 * 24 * 60 * 60

  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    fallbackUserId: String(tokenData.user_id || ""),
  }
}

async function fetchInstagramLoginProfile(accessToken: string, fallbackUserId?: string | null) {
  const profileUrl = new URL("https://graph.instagram.com/v21.0/me")
  profileUrl.searchParams.set("fields", "id,user_id,username,account_type")
  profileUrl.searchParams.set("access_token", accessToken)

  const profileResponse = await fetch(profileUrl.toString())
  const profileData = await profileResponse.json()

  if (profileData.error) {
    throw new Error(profileData.error?.message || "Instagram Login profile fetch failed")
  }

  return {
    id: String(profileData.user_id || profileData.id || fallbackUserId || ""),
    username: String(profileData.username || ""),
    accountType: String(profileData.account_type || "business").toLowerCase(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const { provider, userId } = parseOAuthState(searchParams.get("state"))

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!code || !userId) {
      const metaError = new URL(request.url).searchParams.get("error_description") || "no_code_or_user"
      console.error("[Instagram Callback] Missing code or userId. Meta error:", metaError)
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=auth_failed&detail=${encodeURIComponent(metaError)}`)
    }

    if (provider === "instagram_login") {
      try {
        console.log("[Instagram Callback] Exchanging Instagram Login code for token")
        const token = await exchangeInstagramLoginCode(code)
        const profile = await fetchInstagramLoginProfile(token.accessToken, token.fallbackUserId)

        if (!profile.id || !profile.username) {
          return NextResponse.redirect(`${baseUrl}/admin?ig_error=profile_fetch_failed&detail=Instagram+Login+did+not+return+an+account+id+and+username`)
        }

        await sql`
          INSERT INTO instagram_connections (
            user_id,
            instagram_username,
            instagram_user_id,
            access_token,
            page_id,
            page_name,
            page_access_token,
            token_expires_at,
            account_type,
            messaging_status
          )
          VALUES (
            ${userId},
            ${profile.username},
            ${profile.id},
            ${token.accessToken},
            NULL,
            NULL,
            NULL,
            ${token.expiresAt.toISOString()},
            ${"instagram_login"},
            ${"needs_permission_test"}
          )
          ON CONFLICT (user_id, instagram_username)
          DO UPDATE SET
            instagram_user_id = ${profile.id},
            access_token = ${token.accessToken},
            page_id = NULL,
            page_name = NULL,
            page_access_token = NULL,
            token_expires_at = ${token.expiresAt.toISOString()},
            account_type = ${"instagram_login"},
            messaging_status = ${"needs_permission_test"},
            messaging_test_error = NULL,
            is_active = true,
            updated_at = NOW()
        `

        console.log("[Instagram Callback] Instagram Login connection saved for @", profile.username)

        return NextResponse.redirect(`${baseUrl}/admin?ig_connected=${encodeURIComponent(profile.username)}&ig_provider=instagram_login`)
      } catch (error) {
        console.error("[Instagram Callback] Instagram Login flow failed:", error)
        return NextResponse.redirect(`${baseUrl}/admin?ig_error=instagram_login_failed&detail=${encodeURIComponent(error instanceof Error ? error.message : String(error))}`)
      }
    }

    console.log("[Instagram Callback] Exchanging code for token")

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`,
    )

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error("[Instagram Callback] Token exchange failed:", JSON.stringify(tokenData.error))
      return NextResponse.redirect(`${baseUrl}/admin?ig_error=token_exchange_failed&detail=${encodeURIComponent(tokenData.error.message || tokenData.error.type || "unknown")}`)
    }

    const shortLivedToken = tokenData.access_token
    console.log("[Instagram Callback] Short-lived token obtained, exchanging for long-lived")

    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`,
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
      INSERT INTO instagram_connections (
        user_id,
        instagram_username,
        instagram_user_id,
        access_token,
        page_id,
        page_name,
        page_access_token,
        token_expires_at,
        account_type
      )
      VALUES (
        ${userId},
        ${profileData.username},
        ${instagramUserId},
        ${accessToken},
        ${selectedPage.id || null},
        ${selectedPage.name || null},
        ${selectedPage.access_token || null},
        ${expiresAt.toISOString()},
        ${"business"}
      )
      ON CONFLICT (user_id, instagram_username)
      DO UPDATE SET
        instagram_user_id = ${instagramUserId},
        access_token = ${accessToken},
        page_id = ${selectedPage.id || null},
        page_name = ${selectedPage.name || null},
        page_access_token = ${selectedPage.access_token || null},
        token_expires_at = ${expiresAt.toISOString()},
        account_type = ${"business"},
        messaging_status = ${"needs_permission_test"},
        messaging_test_error = NULL,
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
