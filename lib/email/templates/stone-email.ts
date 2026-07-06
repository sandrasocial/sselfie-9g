// Stone shell - the single shared wrapper for lifecycle + transactional emails (57 templates).
//
// EMAIL-01 (2026-06-11): restyled to the Vault editorial language (lib/email/editorial-email.ts),
// which Sandra locked as THE email design. Same exported API as before, so every template that
// renders through renderStoneShell/renderStoneButton/renderStonePanel upgraded in one move.
// The old warm beige rounded-card look is gone (design doc lists warm beige/cream card drift
// under "Avoid"); this is the same cream-editorial system the Vault drop emails use:
// centered serif headline, square black CTAs, quiet separators, italic "Sandra x" signature.
//
// Email client notes (mirrors editorial-email.ts):
//   - Inline styles are the layout contract (Outlook, older Gmail).
//   - The <style> block adds mobile overrides (classes prefixed st- to avoid collisions).
//   - No web fonts. Georgia / Arial only.

// EMAIL-02 (2026-07-06): palette shifted from warm cream to Sandra's COOL editorial tokens
// (docs/SSELFIE_DESIGN_SYSTEM.md base + the 2026-06-19 cool-monochrome lock: warmth comes
// from her images, never from beige surfaces). Structure unchanged; every template that
// renders through this shell recolored in one move.
const COLORS = {
  shell: "#F8FAFA", // Seasalt outer
  card: "#FFFFFF", // main content card
  panel: "#F8FAFA", // quiet section tint (panels, pull-quote blocks)
  text: "#0D0E10", // Night - headlines, primary
  body: "#282728", // Raisin - body copy
  muted: "#818283", // Gray - captions, eyebrows, footer
  quiet: "#818283", // kept as an alias - legacy templates referenced both tones
  line: "#D8D9DA", // cool separators
  lineSoft: "#E9EAEB",
  cta: "#0D0E10",
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

// Templates wrote inline colors from two older palettes (the dark stone app palette and the
// warm beige shell). Map both onto the editorial palette so 57 bodies recolor without edits.
function normalizeLegacyStoneHtml(html: string): string {
  return (
    html
      // legacy dark-stone palette
      .replaceAll("#f0ede8", COLORS.text)
      .replaceAll("#a8a49c", COLORS.muted)
      .replaceAll("#8a8780", COLORS.muted)
      .replaceAll("#2e2c29", COLORS.panel)
      .replaceAll("#1c1b19", COLORS.card)
      .replaceAll("#0d0c0b", COLORS.text)
      .replaceAll("rgba(240,237,232,0.14)", COLORS.line)
      .replaceAll("rgba(240,237,232,0.08)", COLORS.lineSoft)
      // previous warm beige stone palette
      .replaceAll("#1f1e1c", COLORS.text)
      .replaceAll("#2c2b29", COLORS.body)
      .replaceAll("#69645e", COLORS.muted)
      .replaceAll("#ded7ce", COLORS.line)
      .replaceAll("#eee7df", COLORS.lineSoft)
      .replaceAll("#f3eee7", COLORS.panel)
      .replaceAll("#fffdf9", COLORS.card)
      .replaceAll("#f7f3ee", COLORS.shell)
      .replaceAll("#fbf8f4", COLORS.panel)
      // cream editorial era (EMAIL-01, retired 2026-07-06 for the cool palette)
      .replaceAll("#F5EFE6", COLORS.shell)
      .replaceAll("#FAF8F4", COLORS.panel)
      .replaceAll("#3A3632", COLORS.body)
      .replaceAll("#9B9189", COLORS.muted)
      .replaceAll("#E5DDD4", COLORS.line)
      .replaceAll("#0A0A0A", COLORS.text)
      .replaceAll("#f5efe6", COLORS.shell)
      .replaceAll("#faf8f4", COLORS.panel)
      .replaceAll("#3a3632", COLORS.body)
      .replaceAll("#9b9189", COLORS.muted)
      .replaceAll("#e5ddd4", COLORS.line)
      .replaceAll("#0a0a0a", COLORS.text)
  )
}

export function renderStoneButton(label: string, href: string, tone: "light" | "outline" = "light"): string {
  const background = tone === "light" ? COLORS.cta : "transparent"
  const color = tone === "light" ? "#ffffff" : COLORS.text
  const border = tone === "light" ? `1px solid ${COLORS.cta}` : `1px solid ${COLORS.text}`

  return `<a href="${href}" style="display:inline-block;background:${background};color:${color};border:${border};padding:15px 30px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">${escapeHtml(label)}</a>`
}

export function renderStonePanel(contentHtml: string, eyebrow?: string): string {
  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 12px;color:${COLORS.muted};font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>`
    : ""

  return `<div style="margin:26px 0;padding:22px 24px;background:${COLORS.panel};border-left:3px solid ${COLORS.text};">${eyebrowHtml}${normalizeLegacyStoneHtml(contentHtml)}</div>`
}

// Personal-note format - for recovery and early-nurture emails, where the 2025-26 evidence
// says a personal-looking email beats branded HTML (better Primary-tab placement, 21% higher
// click-to-open). Looks like a note from Sandra: white background, no card, no headline block,
// serif body, plain underlined links, small italic signoff. Use renderPersonalNote for these;
// keep renderStoneShell for delivery, offers, drops, and the newsletter.
export interface PersonalNoteOptions {
  /** <title> tag + preheader context only - never rendered as a visible headline. */
  title: string
  bodyHtml: string
  signoff?: string
}

export function renderPersonalNote({ title, bodyHtml, signoff = "Sandra x" }: PersonalNoteOptions): string {
  const signoffHtml = signoff
    ? `<p style="margin:28px 0 0;color:${COLORS.text};font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;">${escapeHtml(signoff)}</p>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:28px 20px 44px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;" align="center">
          <tr>
            <td style="color:${COLORS.body};font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;text-align:left;">
              ${normalizeLegacyStoneHtml(bodyHtml)}
              ${signoffHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Plain underlined text link for personal notes (a button would read as "brand", not "Sandra"). */
export function renderPersonalLink(label: string, href: string): string {
  return `<a href="${href}" style="color:${COLORS.text};text-decoration:underline;">${escapeHtml(label)}</a>`
}

const RESPONSIVE_STYLES = `
  @media screen and (max-width: 620px) {
    .st-outer-td  { padding: 0 !important; }
    .st-container { width: 100% !important; }
    .st-header    { padding: 30px 24px 22px !important; }
    .st-headline  { font-size: 28px !important; line-height: 1.05 !important; }
    .st-body      { padding: 28px 24px 8px !important; }
    .st-body p    { font-size: 15px !important; line-height: 1.85 !important; }
    .st-footer    { padding: 26px 24px 30px !important; }
    .st-sig       { font-size: 28px !important; }
  }
`

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
    ? `<p style="margin:14px 0 0;color:${COLORS.muted};font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;line-height:1.6;">${escapeHtml(subtitle)}</p>`
    : ""

  const heroHtml = isSafeEmailImageUrl(heroImageUrl)
    ? `<tr>
            <td style="padding:0;line-height:0;font-size:0;background:${COLORS.card};">
              <img src="${heroImageUrl}" alt="${escapeHtml(heroImageAlt || "")}" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>`
    : ""

  const footerLeadHtml = footerLead
    ? `<p style="margin:0 0 14px;color:${COLORS.muted};font-family:Georgia,'Times New Roman',serif;font-size:14px;font-style:italic;line-height:1.7;">${escapeHtml(footerLead)}</p>`
    : ""
  const footerSignoffHtml = footerSignoff
    ? `<p class="st-sig" style="margin:0;color:${COLORS.text};font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;font-style:italic;letter-spacing:-0.01em;">${escapeHtml(footerSignoff)}</p>`
    : ""

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    ${RESPONSIVE_STYLES}
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.shell};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${COLORS.shell};"><tr><td align="center"><![endif]-->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.shell};">
    <tr>
      <td class="st-outer-td" align="center" style="padding:32px 16px 48px;">
        <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="640"><tr><td><![endif]-->
        <table class="st-container" role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background-color:${COLORS.card};" align="center">
          ${heroHtml}

          <!-- ── HEADER ── -->
          <tr>
            <td class="st-header" align="center" style="padding:38px 40px 26px;background-color:${COLORS.card};">
              <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.52em;text-transform:uppercase;color:${COLORS.muted};">${escapeHtml(eyebrow)}</p>
              <h1 class="st-headline" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:400;line-height:1.04;letter-spacing:0.03em;text-transform:uppercase;color:${COLORS.text};">${escapeHtml(title)}</h1>
              ${subtitleHtml}
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td class="st-body" style="padding:34px 40px 10px;background-color:${COLORS.card};color:${COLORS.body};font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;">
              ${normalizeLegacyStoneHtml(bodyHtml)}
            </td>
          </tr>

          <!-- ── SIGNATURE FOOTER ── -->
          <tr>
            <td style="padding:26px 40px 0;background-color:${COLORS.card};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top:1px solid ${COLORS.line};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="st-footer" align="center" style="padding:28px 40px 38px;background-color:${COLORS.card};">
              ${footerLeadHtml}
              ${footerSignoffHtml}
            </td>
          </tr>
        </table>
        <!--[if mso | IE]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
  <!--[if mso | IE]></td></tr></table><![endif]-->
</body>
</html>`
}
