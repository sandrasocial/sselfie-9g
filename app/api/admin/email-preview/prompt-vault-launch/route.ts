import { NextResponse } from "next/server"
import { generatePromptVaultLaunchBroadcast } from "@/lib/email/templates/prompt-vault-launch-broadcast"

// Preview-only route. Protected by ADMIN_PREVIEW_SECRET env var in production.
// GET /api/admin/email-preview/prompt-vault-launch?secret=xxx
export async function GET(request: Request) {
  const secret = process.env.ADMIN_PREVIEW_SECRET
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

  if (isProduction && secret) {
    const { searchParams } = new URL(request.url)
    if (searchParams.get("secret") !== secret) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
  }

  const { html } = generatePromptVaultLaunchBroadcast({ firstName: "Sandra" })

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
