const COLORS = {
  shell: "#f7f3ee",
  card: "#fffdf9",
  panel: "#f3eee7",
  text: "#1f1e1c",
  accent: "#2c2b29",
  muted: "#69645e",
  quiet: "#8a8780",
  line: "#ded7ce",
  lineSoft: "#eee7df",
  cta: "#0a0a0a",
} as const

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function isSafeEmailImageUrl(url: string | undefined): url is string {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:"
  } catch {
    return false
  }
}

function normalizeLegacyStoneHtml(html: string): string {
  return html
    .replaceAll("#f0ede8", COLORS.text)
    .replaceAll("#a8a49c", COLORS.muted)
    .replaceAll("#8a8780", COLORS.quiet)
    .replaceAll("#2e2c29", COLORS.panel)
    .replaceAll("#1c1b19", COLORS.card)
    .replaceAll("#0d0c0b", COLORS.text)
    .replaceAll("rgba(240,237,232,0.14)", COLORS.line)
    .replaceAll("rgba(240,237,232,0.08)", COLORS.lineSoft)
}

export function renderStoneButton(label: string, href: string, tone: "light" | "outline" = "light"): string {
  const background = tone === "light" ? COLORS.cta : "transparent"
  const color = tone === "light" ? "#ffffff" : COLORS.text
  const border = tone === "light" ? `1px solid ${COLORS.cta}` : `1px solid ${COLORS.line}`

  return `<a href="${href}" style="display:inline-block;background:${background};color:${color};border:${border};border-radius:8px;padding:14px 24px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(label)}</a>`
}

export function renderStonePanel(contentHtml: string, eyebrow?: string): string {
  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 10px;color:${COLORS.quiet};font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>`
    : ""

  return `<div style="margin:24px 0;padding:22px 22px 20px;background:${COLORS.panel};border:1px solid ${COLORS.lineSoft};border-radius:18px;">${eyebrowHtml}${normalizeLegacyStoneHtml(contentHtml)}</div>`
}

export interface StoneEmailOptions {
  title: string
  eyebrow?: string
  subtitle?: string
  bodyHtml: string
  footerLead?: string
  footerSignoff?: string
  heroImageUrl?: string
  heroImageAlt?: string
}

export function renderStoneShell({
  title,
  eyebrow = "SSELFIE",
  subtitle,
  bodyHtml,
  footerLead = "Reply if you need me. I read every message.",
  footerSignoff = "Sandra x",
  heroImageUrl,
  heroImageAlt,
}: StoneEmailOptions): string {
  const subtitleHtml = subtitle
    ? `<p style="margin:14px 0 0;color:${COLORS.muted};font-size:14px;line-height:1.7;">${escapeHtml(subtitle)}</p>`
    : ""

  const heroHtml = isSafeEmailImageUrl(heroImageUrl)
    ? `<tr>
            <td style="padding:0;background:${COLORS.card};">
              <img src="${heroImageUrl}" alt="${escapeHtml(heroImageAlt || "")}" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>`
    : ""

  const footerLeadHtml = footerLead
    ? `<p style="margin:0 0 10px;color:${COLORS.muted};font-size:13px;line-height:1.7;">${escapeHtml(footerLead)}</p>`
    : ""
  const footerSignoffHtml = footerSignoff
    ? `<p style="margin:0;color:${COLORS.text};font-size:14px;line-height:1.6;">${escapeHtml(footerSignoff)}</p>`
    : ""

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.shell};font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.shell};">
    <tr>
      <td align="center" style="padding:24px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:24px;overflow:hidden;">
          ${heroHtml}
          <tr>
            <td style="padding:38px 30px 18px;background:${COLORS.card};border-bottom:1px solid ${COLORS.lineSoft};">
              <p style="margin:0;color:${COLORS.quiet};font-size:10px;font-weight:600;letter-spacing:0.36em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:16px 0 0;color:${COLORS.text};font-family:Georgia,'Times New Roman',serif;font-size:42px;font-weight:400;line-height:1.02;letter-spacing:0.01em;">${escapeHtml(title)}</h1>
              ${subtitleHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:${COLORS.text};font-size:16px;line-height:1.75;">
              ${normalizeLegacyStoneHtml(bodyHtml)}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 30px 28px;border-top:1px solid ${COLORS.lineSoft};background:#fbf8f4;">
              ${footerLeadHtml}
              ${footerSignoffHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
