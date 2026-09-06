import "server-only"

import { NextResponse } from "next/server"

import { requireAcademyProductAccess } from "@/lib/academy-server-access"
import { sql } from "@/lib/db/client"

export type ProtectedAcademyWorkbookId = "what_to_say" | "show_up" | "get_paid"

const WORKBOOK_SECURITY_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "Vercel-CDN-Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Robots-Tag": "noindex,nofollow,noarchive",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy": [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ].join("; "),
} as const

type AcademyError = {
  status: number
  body: Record<string, unknown>
}

const DEFAULT_WORKBOOK_IMAGES: Record<ProtectedAcademyWorkbookId, string> = {
  what_to_say: "/academy/visibility-suite/what-to-say.png",
  show_up: "/academy/visibility-suite/show-up.png",
  get_paid: "/academy/visibility-suite/get-paid.png",
}

async function getWorkbookImage(productId: ProtectedAcademyWorkbookId) {
  try {
    const rows = await sql`
      SELECT thumbnail_url
      FROM academy_product_overrides
      WHERE product_id = ${productId}
      LIMIT 1
    `
    const url = (rows[0] as { thumbnail_url?: unknown } | undefined)?.thumbnail_url
    return typeof url === "string" && url.trim() ? url.trim() : DEFAULT_WORKBOOK_IMAGES[productId]
  } catch {
    return DEFAULT_WORKBOOK_IMAGES[productId]
  }
}

function injectWorkbookImage(html: string, imageUrl: string, userId: string) {
  const serialized = JSON.stringify(imageUrl).replace(/</g, "\\u003c")
  const user = JSON.stringify(userId).replace(/</g, "\\u003c")
  return html.replace("<head>", `<head><script>window.SSELFIE_WORKBOOK_USER=${user}</script>`).replace(
    '<script src="/academy-workbook-wizard.js"></script>',
    `<script>window.SSELFIE_COURSE_IMAGE=${serialized}</script><script src="/academy-workbook-sync.js"></script><script src="/academy-workbook-wizard.js"></script>`
  )
}

function isAcademyError(error: unknown): error is AcademyError {
  if (!error || typeof error !== "object") return false
  const candidate = error as Partial<AcademyError>
  return (
    typeof candidate.status === "number" &&
    Boolean(candidate.body) &&
    typeof candidate.body === "object"
  )
}

function securedResponse(
  body: BodyInit | null,
  init: ResponseInit,
  contentType?: string
): NextResponse {
  const headers = new Headers(init.headers)
  for (const [name, value] of Object.entries(WORKBOOK_SECURITY_HEADERS)) {
    headers.set(name, value)
  }
  if (contentType) headers.set("Content-Type", contentType)
  return new NextResponse(body, { ...init, headers })
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headOnly: boolean
): NextResponse {
  return securedResponse(headOnly ? null : JSON.stringify(body), { status }, "application/json")
}

export async function respondWithProtectedAcademyWorkbook({
  request,
  productId,
  canonicalPath,
  headOnly = false,
  readWorkbook,
}: {
  request: Request
  productId: ProtectedAcademyWorkbookId
  canonicalPath: `/academy/${ProtectedAcademyWorkbookId}`
  headOnly?: boolean
  readWorkbook: () => Promise<string>
}): Promise<NextResponse> {
  let userId: string
  try {
    const { neonUser } = await requireAcademyProductAccess(productId)
    userId = neonUser.id
  } catch (error) {
    if (isAcademyError(error) && error.status === 401) {
      const loginUrl = new URL("/auth/login", request.url)
      const requestUrl = new URL(request.url)
      loginUrl.searchParams.set("returnTo", `${canonicalPath}${requestUrl.search}`)
      return securedResponse(null, {
        status: 307,
        headers: { Location: loginUrl.toString() },
      })
    }

    if (isAcademyError(error)) {
      return jsonResponse(error.body, error.status, headOnly)
    }

    console.error(`[academy-workbook] Access check failed for ${productId}:`, error)
    return jsonResponse({ error: "Workbook unavailable" }, 500, headOnly)
  }

  try {
    const html = await readWorkbook()
    const imageUrl = await getWorkbookImage(productId)
    return securedResponse(
      headOnly ? null : injectWorkbookImage(html, imageUrl, userId),
      { status: 200 },
      "text/html; charset=utf-8"
    )
  } catch (error) {
    console.error(`[academy-workbook] Failed to read ${productId}:`, error)
    return jsonResponse({ error: "Workbook unavailable" }, 500, headOnly)
  }
}
