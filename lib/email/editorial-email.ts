// Editorial email shell — used for broadcast/launch emails.
// Supports: big display headlines, full-bleed photos, 3-column photo grids,
// two-column feature rows, and the Sandra x signature.
//
// Transactional nurture emails continue to use stone-email.ts.

const SITE = "https://www.sselfie.ai"

const C = {
  bg:        "#F5EFE6",
  card:      "#FFFFFF",
  section:   "#FAF8F4",
  text:      "#0A0A0A",
  body:      "#3A3632",
  muted:     "#9B9189",
  separator: "#E5DDD4",
  cta:       "#0A0A0A",
  ctaText:   "#FFFFFF",
} as const

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

// ── Image helpers ──────────────────────────────────────────────────────────

export function editorialImg(
  path: string,
  alt = "",
  width = 640,
): string {
  const src = path.startsWith("http") ? path : `${SITE}${path}`
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />`
}

// Full-bleed hero row (no padding)
export function editorialHeroRow(path: string, alt = ""): string {
  return `
    <tr>
      <td style="padding:0;line-height:0;font-size:0;">
        ${editorialImg(path, alt)}
      </td>
    </tr>`
}

// 3-column photo grid — pass exactly 9 paths
export function editorialPhotoGrid(paths: [string, string, string, string, string, string, string, string, string]): string {
  const gap = 2
  const cols = 3
  const w = Math.floor((640 - gap * (cols - 1)) / cols) // ~212

  function cell(path: string, pad: string): string {
    return `<td width="${w}" style="padding:${pad};line-height:0;font-size:0;vertical-align:top;">
        ${editorialImg(path, "", w)}
      </td>`
  }

  const [a, b, c, d, e, f, g, h, i] = paths

  return `
    <tr>
      <td style="padding:0;background:${C.section};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            ${cell(a, `0 ${gap}px ${gap}px 0`)}
            ${cell(b, `0 ${gap}px ${gap}px ${gap}px`)}
            ${cell(c, `0 0 ${gap}px ${gap}px`)}
          </tr>
          <tr>
            ${cell(d, `0 ${gap}px ${gap}px 0`)}
            ${cell(e, `0 ${gap}px ${gap}px ${gap}px`)}
            ${cell(f, `0 0 ${gap}px ${gap}px`)}
          </tr>
          <tr>
            ${cell(g, `0 ${gap}px 0 0`)}
            ${cell(h, `0 ${gap}px 0 ${gap}px`)}
            ${cell(i, `0 0 0 ${gap}px`)}
          </tr>
        </table>
      </td>
    </tr>`
}

// Two-column feature row: bullet list left, description right
export function editorialFeatureRow(
  bullets: string[],
  heading: string,
  description: string,
): string {
  const bulletRows = bullets
    .map(
      (b) =>
        `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${C.text};">${esc(b)}</p>`,
    )
    .join("")

  return `
    <tr>
      <td style="padding:0;background:${C.section};border-top:1px solid ${C.separator};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td width="44%" style="padding:32px 16px 32px 40px;vertical-align:top;border-right:1px solid ${C.separator};">
              ${bulletRows}
            </td>
            <td width="56%" style="padding:32px 40px 32px 20px;vertical-align:top;">
              <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.4em;text-transform:uppercase;color:${C.muted};">${esc(heading)}</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:${C.body};">${esc(description)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

// CTA button — full-width or inline
export function editorialCTA(label: string, href: string, fullWidth = false): string {
  const display = fullWidth ? "block" : "inline-block"
  const extra   = fullWidth ? "text-align:center;" : ""
  return `<a href="${esc(href)}" style="display:${display};${extra}background:${C.cta};color:${C.ctaText};font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;text-decoration:none;padding:17px 40px;border:0;">${esc(label)}</a>`
}

// Horizontal rule
function hr(): string {
  return `
    <tr>
      <td style="padding:0 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="border-top:1px solid ${C.separator};font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>`
}

// ── Main shell ─────────────────────────────────────────────────────────────

export interface EditorialEmailOptions {
  title: string           // Used in <title> tag only
  eyebrow?: string        // e.g. "SSELFIE"
  headline: string        // Big display headline, supports \n for line breaks
  subline?: string        // Small uppercase text below headline
  bodyRows: string        // Pre-built <tr>…</tr> blocks
  footerNote?: string     // Small unsubscribe / reply note
}

export function renderEditorialShell({
  title,
  eyebrow = "SSELFIE",
  headline,
  subline,
  bodyRows,
  footerNote = "You are receiving this because you signed up at sselfie.ai. Reply to unsubscribe.",
}: EditorialEmailOptions): string {
  const headlineHtml = headline
    .split("\n")
    .map((l) => esc(l))
    .join("<br />")

  const sublineHtml = subline
    ? `<p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.46em;text-transform:uppercase;color:${C.muted};">${esc(subline)}</p>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.bg};">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${C.card};">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;background:${C.card};">
              <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.52em;text-transform:uppercase;color:${C.muted};">${esc(eyebrow)}</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:52px;font-weight:400;line-height:0.96;letter-spacing:0.03em;text-transform:uppercase;color:${C.text};">${headlineHtml}</h1>
              ${sublineHtml}
            </td>
          </tr>

          ${bodyRows}

          <!-- ── SIGNATURE ── -->
          ${hr()}
          <tr>
            <td align="center" style="padding:32px 40px 40px;background:${C.card};">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:400;font-style:italic;color:${C.text};letter-spacing:-0.01em;">Sandra x</p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding:18px 40px 28px;background:${C.bg};border-top:1px solid ${C.separator};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${C.muted};">${esc(footerNote)}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
