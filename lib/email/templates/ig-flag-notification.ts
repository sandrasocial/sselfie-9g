type IgFlagNotificationParams = {
  username: string
  message: string
  flagReason: string
  conversationId: number
  draftResponse?: string | null
  profilePicUrl?: string | null
  isIcelandic?: boolean
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function generateIgFlagNotificationEmail(params: IgFlagNotificationParams) {
  const subject = params.isIcelandic
    ? `Icelandic contact: @${params.username}`
    : `@${params.username} needs you`
  const viewUrl = `${SITE_URL}/my-inbox?conversation=${params.conversationId}`
  const adminUrl = `${SITE_URL}/admin/ig-inbox?conversation=${params.conversationId}`
  const safeMessage = escapeHtml(params.message)
  const safeDraft = params.draftResponse ? escapeHtml(params.draftResponse) : ""

  const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#F8FAFA;color:#0D0E10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
      <p style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#818283;margin:0 0 20px;">SSELFIE IG Agent</p>
      <h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.05;margin:0 0 20px;">@${escapeHtml(params.username)} needs you</h1>
      ${params.profilePicUrl ? `<img src="${params.profilePicUrl}" alt="" width="56" height="56" style="border-radius:50%;object-fit:cover;margin:0 0 18px;">` : ""}
      <div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 18px;">
        <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#818283;margin:0 0 12px;">They said</p>
        <p style="font-size:17px;line-height:1.6;white-space:pre-wrap;margin:0;">${safeMessage}</p>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#4F5052;margin:0 0 22px;"><strong>Flag reason:</strong> ${escapeHtml(params.flagReason)}</p>
      ${
        safeDraft
          ? `<div style="background:#fff;border:1px solid rgba(197,198,200,.45);padding:22px;margin:0 0 22px;">
              <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#818283;margin:0 0 12px;">Agent draft</p>
              <p style="font-size:15px;line-height:1.7;white-space:pre-wrap;margin:0;">${safeDraft}</p>
            </div>`
          : ""
      }
      <p style="margin:0 0 12px;">
        <a href="${viewUrl}" style="display:inline-block;background:#0D0E10;color:#fff;text-decoration:none;padding:14px 18px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;">Open My Inbox</a>
      </p>
      <p style="font-size:13px;color:#818283;margin:18px 0 0;">Admin fallback: <a href="${adminUrl}" style="color:#4F5052;">open full admin conversation</a></p>
    </div>
  </body>
</html>`

  const text = `@${params.username} needs you\n\nThey said:\n${params.message}\n\nFlag reason: ${params.flagReason}\n\nOpen: ${viewUrl}${params.draftResponse ? `\n\nAgent draft:\n${params.draftResponse}` : ""}`

  return { subject, html, text }
}

