import { NextRequest, NextResponse } from "next/server"
import { recordEmailUnsubscribe } from "@/lib/email/unsubscribe"

export const runtime = "nodejs"

function unsubscribeHtml(success: boolean): string {
  const title = success ? "You are unsubscribed" : "This unsubscribe link is not valid"
  const body = success
    ? "You will no longer receive SSELFIE marketing emails. Transactional emails for purchases, account access, or support may still be sent when needed."
    : "Please use the unsubscribe link from your latest SSELFIE email."

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#f7f1ea;color:#2f2926;font-family:Arial,sans-serif;">
        <main style="max-width:560px;margin:0 auto;padding:64px 24px;">
          <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">${title}</h1>
          <p style="font-size:16px;line-height:1.6;margin:0;">${body}</p>
        </main>
      </body>
    </html>`
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const result = await recordEmailUnsubscribe(token, "visible-link", request.headers.get("user-agent"))

  return new NextResponse(unsubscribeHtml(result.success), {
    status: result.success ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  const result = await recordEmailUnsubscribe(token, "one-click", request.headers.get("user-agent"))

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  })
}
