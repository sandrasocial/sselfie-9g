import { generateLaunchEmail } from "@/lib/email/templates/launch-email"

export async function GET() {
  try {
    const { html } = generateLaunchEmail({
      recipientName: "Sandra",
    })

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("[v0] Error previewing launch email:", error)
    return new Response(JSON.stringify({ error: "Failed to preview launch email" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
