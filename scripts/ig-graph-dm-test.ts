import dotenv from "dotenv"
import { sql } from "../lib/db/client"
import { resolveInstagramConnectionMode } from "../lib/instagram/connection-mode"

dotenv.config({ path: ".env.local", quiet: true })

type GraphResult = {
  ok: boolean
  status: number
  data: any
}

type ConnectionRow = {
  id: number
  instagram_username: string
  instagram_user_id: string | null
  page_id: string | null
  page_name: string | null
  account_type: string | null
  access_token: string | null
  page_access_token: string | null
  messaging_status: string | null
  token_expires_at: string | null
}

const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || "v21.0"
const DEFAULT_SUBSCRIBED_FIELDS = "messages,messaging_postbacks,message_reads,message_echoes"
const DEFAULT_TEST_MESSAGE = "Testing the SSELFIE Instagram DM connection. No need to reply."

function parseArgs() {
  const args = process.argv.slice(2)
  const value = (name: string) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }

  return {
    username: value("--username") || "sandra.social",
    subscribe: args.includes("--subscribe"),
    send: args.includes("--send"),
    recipient: value("--recipient"),
    message: value("--message") || DEFAULT_TEST_MESSAGE,
    subscribedFields: value("--fields") || DEFAULT_SUBSCRIBED_FIELDS,
    probeConversations: args.includes("--probe-conversations"),
  }
}

function redactGraphError(data: any) {
  const error = data?.error
  if (!error) return data
  return {
    error: {
      message: error.message,
      type: error.type,
      code: error.code,
      error_subcode: error.error_subcode,
      error_user_title: error.error_user_title,
      error_user_msg: error.error_user_msg,
      fbtrace_id: error.fbtrace_id,
    },
  }
}

async function graphRequest(path: string, token: string, init?: { method?: string; search?: Record<string, string> }) {
  const url = new URL(
    path.startsWith("https://")
      ? path
      : `https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\/+/, "")}`,
  )
  for (const [key, value] of Object.entries(init?.search || {})) {
    url.searchParams.set(key, value)
  }
  url.searchParams.set("access_token", token)

  const response = await fetch(url, { method: init?.method || "GET" })
  const data = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, data: redactGraphError(data) } satisfies GraphResult
}

async function graphJsonPost(url: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, data: redactGraphError(data) } satisfies GraphResult
}

async function loadConnection(username: string) {
  const rows = await sql`
    SELECT id, instagram_username, instagram_user_id, page_id, page_name, account_type,
           access_token, page_access_token, messaging_status, token_expires_at
    FROM instagram_connections
    WHERE instagram_username = ${username}
      AND is_active = TRUE
    ORDER BY updated_at DESC NULLS LAST, connected_at DESC NULLS LAST
    LIMIT 1
  `
  return rows[0] as ConnectionRow | undefined
}

function summarize(result: GraphResult | null | undefined) {
  if (!result) return "skipped"
  if (result.ok) return "ok"
  const message = result.data?.error?.message || `HTTP ${result.status}`
  if (message.includes("pages_messaging")) return "needs_reconnect_pages_messaging"
  if (message.includes("pages_manage_metadata")) return "needs_reconnect_pages_manage_metadata"
  if (message.includes("Advanced Access") || message.includes("capability")) return "needs_meta_permission_or_reconnect"
  if (message.includes("Timeout")) return "graph_conversation_timeout"
  return "failed"
}

async function main() {
  const args = parseArgs()
  const connection = await loadConnection(args.username)
  if (!connection) {
    throw new Error(`No active Instagram connection found for @${args.username}`)
  }

  const mode = resolveInstagramConnectionMode({
    access_token: connection.access_token,
    page_access_token: connection.page_access_token,
    account_type: connection.account_type,
  })
  const token = mode === "instagram_login"
    ? connection.access_token
    : connection.page_access_token || connection.access_token

  if (!token) {
    throw new Error("Active Instagram connection is missing a usable messaging token")
  }
  if (!connection.instagram_user_id) {
    throw new Error("Active Instagram connection is missing instagram_user_id")
  }

  const report: Record<string, unknown> = {
    connection: {
      id: connection.id,
      username: connection.instagram_username,
      instagramUserId: connection.instagram_user_id,
      pageId: connection.page_id,
      pageName: connection.page_name,
      mode,
      messagingStatus: connection.messaging_status,
      tokenExpiresAt: connection.token_expires_at,
      hasAccessToken: Boolean(connection.access_token),
      hasPageAccessToken: Boolean(connection.page_access_token),
    },
  }

  const profile = mode === "instagram_login"
    ? await graphRequest(`https://graph.instagram.com/${GRAPH_VERSION}/me`, token, {
        search: { fields: "id,user_id,username,account_type" },
      })
    : await graphRequest(`/${connection.instagram_user_id}`, token, {
        search: { fields: "id,username,name" },
      })
  report.profile = profile

  let subscribedApps: GraphResult | null = null
  if (mode === "facebook_page" && connection.page_id) {
    subscribedApps = await graphRequest(`/${connection.page_id}/subscribed_apps`, token, {
      search: { fields: "id,name,subscribed_fields" },
    })
    report.subscribedApps = subscribedApps
  } else {
    report.subscribedApps = { skipped: "Instagram Login mode does not use the Facebook Page subscribed_apps check." }
  }

  if (args.subscribe) {
    if (mode !== "facebook_page" || !connection.page_id) {
      report.subscribe = { skipped: "Subscribe step only applies to Facebook Page mode." }
    } else {
      report.subscribe = await graphRequest(`/${connection.page_id}/subscribed_apps`, token, {
        method: "POST",
        search: { subscribed_fields: args.subscribedFields },
      })
    }
  }

  if (args.probeConversations) {
    const conversationPath = mode === "instagram_login"
      ? `https://graph.instagram.com/${GRAPH_VERSION}/${connection.instagram_user_id}/conversations`
      : `/${connection.page_id}/conversations`
    report.conversationProbe = await graphRequest(conversationPath, token, {
      search: {
        platform: "instagram",
        limit: "1",
        fields: "id,updated_time,participants,messages.limit(1){id,message,from,to,created_time}",
      },
    })
  }

  if (args.send) {
    if (!args.recipient) {
      throw new Error("--send requires --recipient <instagram-scoped-user-id>")
    }

    const endpoint = mode === "instagram_login"
      ? `https://graph.instagram.com/${GRAPH_VERSION}/${connection.instagram_user_id}/messages`
      : `https://graph.facebook.com/${GRAPH_VERSION}/${connection.page_id}/messages`
    const body = mode === "instagram_login"
      ? { recipient: { id: args.recipient }, message: { text: args.message } }
      : { messaging_type: "RESPONSE", recipient: { id: args.recipient }, message: { text: args.message } }

    const sendResult = await graphJsonPost(endpoint, token, body)
    report.send = sendResult

    await sql`
      UPDATE instagram_connections
      SET messaging_status = ${sendResult.ok ? "ok" : "failed"},
          last_messaging_test_at = NOW(),
          messaging_test_error = ${sendResult.ok ? null : sendResult.data?.error?.message || `HTTP ${sendResult.status}`},
          updated_at = NOW()
      WHERE id = ${connection.id}
    `
  }

  const subscribedAppsSummary = summarize(subscribedApps)
  const subscribeSummary = args.subscribe ? summarize(report.subscribe as GraphResult) : "not_attempted"

  report.summary = {
    profile: summarize(profile),
    subscribedApps: subscribedAppsSummary,
    subscribe: subscribeSummary,
    send: args.send ? summarize(report.send as GraphResult) : "not_attempted",
    nextStep:
      subscribedAppsSummary === "needs_reconnect_pages_manage_metadata" ||
      subscribeSummary === "needs_reconnect_pages_messaging"
        ? "Deploy this branch, reconnect Instagram from /admin so the token includes pages_manage_metadata and pages_messaging, then rerun this script with --subscribe."
        : args.send
          ? "If send is ok, Claude can use the Graph DM path for known Graph conversation recipients."
          : "Run with --subscribe after reconnect; run with --send --recipient <IGSID> only for a known test recipient.",
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
