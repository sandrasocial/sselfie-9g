const COLORS = {
  shell: "#0d0c0b",
  card: "#1c1b19",
  panel: "#2e2c29",
  text: "#f0ede8",
  accent: "#c8c4bb",
  muted: "#a8a49c",
  quiet: "#8a8780",
  line: "rgba(240, 237, 232, 0.14)",
  lineSoft: "rgba(240, 237, 232, 0.08)",
} as const

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function renderStoneButton(label: string, href: string, tone: "light" | "outline" = "light"): string {
  const background = tone === "light" ? COLORS.text : "transparent"
  const color = tone === "light" ? COLORS.shell : COLORS.text
  const border = tone === "light" ? "none" : `1px solid ${COLORS.line}`

  return `<a href="${href}" style="display:inline-block;background:${background};color:${color};border:${border};border-radius:999px;padding:14px 24px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(label)}</a>`
}

export function renderStonePanel(contentHtml: string, eyebrow?: string): string {
  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 10px;color:${COLORS.quiet};font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>`
    : ""

  return `<div style="margin:24px 0;padding:22px 22px 20px;background:${COLORS.panel};border:1px solid ${COLORS.lineSoft};border-radius:18px;">${eyebrowHtml}${contentHtml}</div>`
}

export interface StoneEmailOptions {
  title: string
  eyebrow?: string
  subtitle?: string
  bodyHtml: string
  footerLead?: string
  footerSignoff?: string
}

export function renderStoneShell({
  title,
  eyebrow = "SSELFIE",
  subtitle,
  bodyHtml,
  footerLead = "Reply if you need me. I read every message.",
  footerSignoff = "Sandra",
}: StoneEmailOptions): string {
  const subtitleHtml = subtitle
    ? `<p style="margin:14px 0 0;color:${COLORS.muted};font-size:14px;line-height:1.7;">${escapeHtml(subtitle)}</p>`
    : ""

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.shell};font-family:Inter,Arial,sans-serif;color:${COLORS.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.shell};">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:28px;overflow:hidden;">
          <tr>
            <td style="padding:36px 30px 18px;background:linear-gradient(180deg, rgba(240,237,232,0.03) 0%, rgba(28,27,25,1) 100%);border-bottom:1px solid ${COLORS.lineSoft};">
              <p style="margin:0;color:${COLORS.quiet};font-size:10px;font-weight:600;letter-spacing:0.4em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:16px 0 0;color:${COLORS.text};font-family:'Cormorant Garamond',Georgia,serif;font-size:44px;font-weight:300;line-height:0.95;letter-spacing:0.03em;">${escapeHtml(title)}</h1>
              ${subtitleHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:${COLORS.text};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 30px 28px;border-top:1px solid ${COLORS.lineSoft};background:rgba(255,255,255,0.02);">
              <p style="margin:0 0 10px;color:${COLORS.muted};font-size:13px;line-height:1.7;">${escapeHtml(footerLead)}</p>
              <p style="margin:0;color:${COLORS.text};font-size:14px;line-height:1.6;">${escapeHtml(footerSignoff)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
