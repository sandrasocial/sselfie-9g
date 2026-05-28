type BriefConversation = {
  id: number
  username: string
  message: string
  flagReason: string | null
}

type IgMorningBriefingParams = {
  flagged: BriefConversation[]
  handledYesterday: number
  topTags: Array<{ tag: string; count: number }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function generateIgMorningBriefingEmail(params: IgMorningBriefingParams) {
  const flaggedCount = params.flagged.length
  const subject = flaggedCount > 0
    ? `${flaggedCount} DMs need you today + your audience signals`
    : "All caught up - here's what your audience is saying"
  const contentSignal = params.topTags[0]
    ? `${params.topTags[0].count} recent messages matched ${params.topTags[0].tag.replace(/_/g, " ")}.`
    : "No strong signal yet. Let the agent collect a little more."

  const flaggedHtml = flaggedCount > 0
    ? params.flagged.map((item) => `
        <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:18px;margin:0 0 12px;">
          <p style="margin:0 0 8px;font-weight:600;">@${escapeHtml(item.username)}</p>
          <p style="margin:0 0 10px;color:#4F5052;line-height:1.5;">${escapeHtml(item.message)}</p>
          <p style="margin:0;font-size:12px;color:#818283;">${escapeHtml(item.flagReason || "needs review")} · <a href="${SITE_URL}/my-inbox?conversation=${item.id}" style="color:#0D0E10;">open</a></p>
        </div>
      `).join("")
    : `<div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 18px;"><p style="margin:0;">You're all caught up 🤍</p></div>`

  const tagList = params.topTags.length > 0
    ? params.topTags.map((tag) => `<li>${escapeHtml(tag.tag.replace(/_/g, " "))}: ${tag.count}</li>`).join("")
    : "<li>No clear tags yet</li>"

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#F8FAFA;color:#0D0E10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <p style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#818283;margin:0 0 20px;">SSELFIE IG Agent</p>
      <h1 style="font-family:Georgia,serif;font-weight:400;font-size:34px;line-height:1.05;margin:0 0 22px;">Morning inbox</h1>
      <h2 style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px;">Needs you</h2>
      ${flaggedHtml}
      <h2 style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:28px 0 14px;">Handled yesterday</h2>
      <p style="font-size:18px;margin:0 0 20px;">${params.handledYesterday} conversations handled or drafted.</p>
      <h2 style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:28px 0 14px;">Audience signals</h2>
      <ul style="line-height:1.7;color:#4F5052;">${tagList}</ul>
      <p style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:18px;line-height:1.6;"><strong>One content signal:</strong> ${escapeHtml(contentSignal)}</p>
      <p style="margin:24px 0 0;"><a href="${SITE_URL}/my-inbox" style="display:inline-block;background:#0D0E10;color:#fff;text-decoration:none;padding:14px 18px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;">Open My Inbox</a></p>
    </div>
  </body>
</html>`

  const text = `Morning inbox\n\nFlagged: ${flaggedCount}\nHandled yesterday: ${params.handledYesterday}\nTop signals:\n${params.topTags.map((tag) => `- ${tag.tag}: ${tag.count}`).join("\n") || "- No clear tags yet"}\n\n${contentSignal}\n\nOpen: ${SITE_URL}/my-inbox`

  return { subject, html, text }
}

