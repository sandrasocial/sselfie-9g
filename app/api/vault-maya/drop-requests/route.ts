import { NextResponse } from "next/server"
import { del, put } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getSuiteAccess } from "@/lib/trial/suite-trial"

export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 2000
const MAX_INSPIRATION_BYTES = 12 * 1024 * 1024
const ALLOWED_INSPIRATION_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function asUploadedImage(value: FormDataEntryValue | null): File | null {
  if (!value || typeof value === "string") return null
  return value.size > 0 ? value : null
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const neonUserId = await getUserIdFromSupabase(user.id)
  if (!neonUserId) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 })
  }

  if (!isAdminEmail(user.email)) {
    const access = await getSuiteAccess(String(neonUserId))
    if (access.level !== "vault" && access.level !== "member" && access.level !== "trial") {
      return NextResponse.json({ error: "Vault Maya membership required" }, { status: 403 })
    }
  }

  let message = ""
  let inspoImageUrl: string | null = null
  let inspirationFile: File | null = null
  try {
    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const formMessage = form.get("message")
      if (typeof formMessage === "string") message = formMessage.trim()
      inspirationFile = asUploadedImage(form.get("inspiration"))
    } else {
      const body = await request.json()
      if (typeof body?.message === "string") message = body.message.trim()
      if (typeof body?.inspoImageUrl === "string" && /^https:\/\//.test(body.inspoImageUrl)) {
        inspoImageUrl = body.inspoImageUrl.slice(0, 2048)
      }
    }
  } catch {
    return NextResponse.json(
      { error: "That request could not be read. Try again." },
      { status: 400 }
    )
  }

  if (!message && !inspirationFile && !inspoImageUrl) {
    return NextResponse.json(
      { error: "Tell Sandra what you want or attach an inspiration photo" },
      { status: 400 }
    )
  }
  if (message.length > MAX_MESSAGE_LENGTH) message = message.slice(0, MAX_MESSAGE_LENGTH)

  if (inspirationFile) {
    if (!ALLOWED_INSPIRATION_TYPES.has(inspirationFile.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 })
    }
    if (inspirationFile.size > MAX_INSPIRATION_BYTES) {
      return NextResponse.json(
        { error: "That image is too large. Choose one under 12 MB." },
        { status: 400 }
      )
    }
  }

  // Simple flood guard: max 10 requests per user per day.
  const recent = await sql`
    SELECT COUNT(*)::int AS n FROM vault_maya_drop_requests
    WHERE user_id = ${String(neonUserId)} AND created_at > NOW() - interval '1 day'
  `
  if (Number(recent[0]?.n || 0) >= 10) {
    return NextResponse.json(
      { error: "That's plenty for today — Sandra has your ideas." },
      { status: 429 }
    )
  }

  let uploadedInspirationUrl: string | null = null
  try {
    if (inspirationFile) {
      const extension =
        inspirationFile.type === "image/png"
          ? "png"
          : inspirationFile.type === "image/webp"
            ? "webp"
            : "jpg"
      const blob = await put(
        `vault-maya/drop-request-inspiration/${neonUserId}-${crypto.randomUUID()}.${extension}`,
        inspirationFile,
        {
          access: "public",
          contentType: inspirationFile.type,
          addRandomSuffix: true,
        }
      )
      uploadedInspirationUrl = blob.url
      inspoImageUrl = blob.url
    }

    await sql`
      INSERT INTO vault_maya_drop_requests (user_id, message, inspo_image_url)
      VALUES (${String(neonUserId)}, ${message || "Inspiration image attached"}, ${inspoImageUrl})
    `
  } catch (error) {
    if (uploadedInspirationUrl) {
      await del(uploadedInspirationUrl).catch(() => {})
    }
    console.error("[vault-maya drop request] failed:", error)
    return NextResponse.json({ error: "That didn't send. Try again." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
