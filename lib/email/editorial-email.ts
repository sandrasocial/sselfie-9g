// Editorial email shell — broadcast and launch emails for SSELFIE.
//
// Architecture:
//   renderEditorialShell()  wraps everything — head, responsive <style>, body table
//   Row helpers             compose body content (storyRow, photoGrid, featureRow, etc.)
//   editorialImg / editorialHeroRow  low-level image primitives
//
// Email client notes:
//   — Inline styles are the primary layout contract (Outlook, older Gmail).
//   — The <style> block adds responsive overrides via media queries (iOS Mail,
//     Apple Mail, Gmail mobile, modern webmail). Outlook ignores it entirely,
//     which is fine — the inline table layout looks good at 640px.
//   — No web fonts. Georgia / Arial only.
//   — All responsive class names are prefixed ev- to avoid collisions.

const SITE = "https://www.sselfie.ai"

// ── Colour tokens ──────────────────────────────────────────────────────────
const C = {
  bg:        "#F5EFE6",   // outer cream shell
  card:      "#FFFFFF",   // main content card
  section:   "#FAF8F4",   // alternating section tint
  text:      "#0A0A0A",   // primary black
  body:      "#3A3632",   // body copy charcoal
  muted:     "#9B9189",   // captions, eyebrows, footer
  separator: "#E5DDD4",   // horizontal rules and column borders
  cta:       "#0A0A0A",   // button background
  ctaText:   "#FFFFFF",   // button text
} as const

// ── Utility ────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

// Resolve a path or absolute URL to a full https image src.
function imgSrc(path: string): string {
  return path.startsWith("http") ? path : `${SITE}${path}`
}

// ── Responsive <style> block ───────────────────────────────────────────────
// Only override what can't be done with tables + inline styles.
// !important is required to beat inline styles in supporting clients.

const RESPONSIVE_STYLES = `
  /* ── SSELFIE editorial email — responsive overrides ── */

  /* Outer wrapper: remove side padding on small screens */
  @media screen and (max-width: 620px) {
    .ev-outer-td  { padding: 0 !important; }
    .ev-container { width: 100% !important; }

    /* Header */
    .ev-header    { padding: 28px 24px 20px !important; }
    .ev-eyebrow   { margin-bottom: 14px !important; }
    .ev-headline  {
      font-size: 36px !important;
      line-height: 0.97 !important;
      letter-spacing: 0.02em !important;
    }
    .ev-subline   { margin-top: 12px !important; }

    /* Story / body copy rows */
    .ev-story     { padding: 32px 24px 0 !important; }
    .ev-story p   { font-size: 15px !important; line-height: 1.85 !important; margin-bottom: 18px !important; }

    /* Pull-quote */
    .ev-pq-outer  { padding: 0 24px 28px !important; }
    .ev-pq-inner  { padding: 20px 20px !important; }
    .ev-pq-text   { font-size: 18px !important; }

    /* Inline CTA row (button + price side by side) */
    .ev-cta-row   { padding: 0 24px 36px !important; }

    /* Section title */
    .ev-sec-title { padding: 22px 24px !important; font-size: 24px !important; }

    /* Photo grid — keep 3 cols, images scale via width:100% */
    .ev-grid-outer { padding: 0 !important; }

    /* Feature row: stack left col on top of right col */
    .ev-feat-l {
      display: block !important;
      width: 100% !important;
      border-right: none !important;
      border-bottom: 1px solid ${C.separator} !important;
      padding: 28px 24px 22px !important;
    }
    .ev-feat-r {
      display: block !important;
      width: 100% !important;
      padding: 22px 24px 28px !important;
    }

    /* Collections list */
    .ev-collections { padding: 28px 24px 12px !important; }
    .ev-collections p { font-size: 15px !important; }

    /* Wide image break */
    .ev-img-break { padding: 22px 0 0 !important; }

    /* Closing copy */
    .ev-closing   { padding: 32px 24px 28px !important; }
    .ev-closing p { font-size: 15px !important; }

    /* Final full-width CTA */
    .ev-final-cta { padding: 0 24px 40px !important; }
    .ev-final-cta a { padding: 16px 24px !important; font-size: 9px !important; }
    .ev-final-note  { font-size: 10px !important; }

    /* Signature */
    .ev-hr-td { padding: 0 24px !important; }
    .ev-sig   { padding: 24px 24px 32px !important; font-size: 34px !important; }

    /* Footer */
    .ev-footer { padding: 16px 24px 24px !important; }
  }
`

// ── Low-level image primitives ─────────────────────────────────────────────

// Inline responsive image (width:100% beats any fixed px width in email).
export function editorialImg(path: string, alt = "", width = 640): string {
  return `<img src="${esc(imgSrc(path))}" alt="${esc(alt)}" width="${width}" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />`
}

// Full-bleed hero — no padding, no gap.
export function editorialHeroRow(path: string, alt = ""): string {
  return `
  <tr>
    <td style="padding:0;line-height:0;font-size:0;">
      ${editorialImg(path, alt)}
    </td>
  </tr>`
}

// ── Row helpers ────────────────────────────────────────────────────────────

// Body copy: pass an array of paragraph strings. Each becomes a <p>.
export function editorialStoryRow(paragraphs: string[], extraBottom = false): string {
  const grafs = paragraphs
    .map((p) => `<p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:${C.body};">${p}</p>`)
    .join("\n        ")

  const pb = extraBottom ? "padding-bottom:0;" : ""
  return `
  <tr>
    <td class="ev-story" style="padding:44px 40px 0;background:${C.card};${pb}">
      ${grafs}
    </td>
  </tr>`
}

// Pull-quote: italic block-quote with left border accent.
export function editorialPullquoteRow(text: string): string {
  return `
  <tr>
    <td class="ev-pq-outer" style="padding:0 40px 32px;background:${C.card};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td class="ev-pq-inner" style="padding:24px 28px;border-left:3px solid ${C.text};background:${C.section};">
            <p class="ev-pq-text" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;font-style:italic;line-height:1.65;color:${C.text};">${esc(text)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// Inline CTA: black button with italic price/note to its right.
export function editorialPriceCTARow(label: string, href: string, priceNote: string): string {
  return `
  <tr>
    <td class="ev-cta-row" style="padding:0 40px 44px;background:${C.card};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding-right:22px;">
            <a href="${esc(href)}" style="display:inline-block;background:${C.cta};color:${C.ctaText};font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.32em;text-transform:uppercase;text-decoration:none;padding:16px 32px;border:0;white-space:nowrap;">${esc(label)}</a>
          </td>
          <td>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;color:${C.muted};white-space:nowrap;">${esc(priceNote)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// Section title row: the "Inside THE VAULT" mixed italic/serif treatment.
// italic = the cursive word, upper = the remaining uppercase part.
export function editorialSectionTitleRow(italic: string, upper: string, bgColor = C.section): string {
  return `
  <tr>
    <td align="center" style="padding:28px 40px;background:${bgColor};border-top:1px solid ${C.separator};">
      <p class="ev-sec-title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:${C.text};letter-spacing:0.01em;"><em>${esc(italic)}</em> ${esc(upper)}</p>
    </td>
  </tr>`
}

// 3×3 photo grid. Pass exactly 9 {path, alt} objects.
export type GridImage = { path: string; alt?: string }

export function editorialPhotoGrid(
  images: [GridImage, GridImage, GridImage, GridImage, GridImage, GridImage, GridImage, GridImage, GridImage],
): string {
  const gap = 2
  // 3 columns, subtract 2 gaps of 2px each = 636px total image width, /3 = 212px each
  const w = 212

  function cell(img: GridImage, leftPad: number, rightPad: number, isLastRow: boolean): string {
    const pb = isLastRow ? 0 : gap
    const src = imgSrc(img.path)
    const alt = esc(img.alt ?? "")
    return `
        <td width="${w}" style="padding:0 ${rightPad}px ${pb}px ${leftPad}px;line-height:0;font-size:0;vertical-align:top;">
          <img src="${esc(src)}" alt="${alt}" width="${w}" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
        </td>`
  }

  const [a, b, c, d, e, f, g, h, img_i] = images

  return `
  <tr>
    <td class="ev-grid-outer" style="padding:0;background:${C.section};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          ${cell(a, 0, gap, false)}
          ${cell(b, gap, gap, false)}
          ${cell(c, gap, 0, false)}
        </tr>
        <tr>
          ${cell(d, 0, gap, false)}
          ${cell(e, gap, gap, false)}
          ${cell(f, gap, 0, false)}
        </tr>
        <tr>
          ${cell(g, 0, gap, true)}
          ${cell(h, gap, gap, true)}
          ${cell(img_i, gap, 0, true)}
        </tr>
      </table>
    </td>
  </tr>`
}

// Two-column feature row: bullet list left, prose right.
// Stacks on mobile via .ev-feat-l / .ev-feat-r media query overrides.
export function editorialFeatureRow(
  bullets: string[],
  heading: string,
  description: string,
): string {
  const bulletHtml = bullets
    .map(
      (b) =>
        `<p style="margin:0 0 9px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${C.text};">${esc(b)}</p>`,
    )
    .join("")

  return `
  <tr>
    <td style="padding:0;background:${C.section};border-top:1px solid ${C.separator};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td class="ev-feat-l" width="44%" style="padding:32px 16px 32px 40px;vertical-align:top;border-right:1px solid ${C.separator};">
            ${bulletHtml}
          </td>
          <td class="ev-feat-r" width="56%" style="padding:32px 40px 32px 20px;vertical-align:top;">
            <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.44em;text-transform:uppercase;color:${C.muted};">${esc(heading)}</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.9;color:${C.body};">${esc(description)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// Full-width image break (landscape, edge to edge within card).
export function editorialImageBreakRow(path: string, alt = "", topPadding = 28): string {
  return `
  <tr>
    <td class="ev-img-break" style="padding:${topPadding}px 0 0;background:${C.card};line-height:0;font-size:0;">
      ${editorialImg(path, alt)}
    </td>
  </tr>`
}

// Closing body copy — same as storyRow but with different padding.
export function editorialClosingRow(paragraphs: string[]): string {
  const grafs = paragraphs
    .map((p) => `<p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:${C.body};">${p}</p>`)
    .join("\n        ")

  return `
  <tr>
    <td class="ev-closing" style="padding:40px 40px 36px;background:${C.card};">
      ${grafs}
    </td>
  </tr>`
}

// Final full-width CTA block — black bar button, centred, with a subline note.
export function editorialFinalCTARow(label: string, href: string, note = ""): string {
  const noteHtml = note
    ? `<p class="ev-final-note" style="margin:14px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.muted};letter-spacing:0.08em;">${esc(note)}</p>`
    : ""

  return `
  <tr>
    <td class="ev-final-cta" style="padding:0 40px 48px;background:${C.card};">
      <a href="${esc(href)}" style="display:block;text-align:center;background:${C.cta};color:${C.ctaText};font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;text-decoration:none;padding:18px 40px;border:0;">${esc(label)}</a>
      ${noteHtml}
    </td>
  </tr>`
}

// Separator row with optional vertical rhythm.
export function editorialHrRow(topSpacing = 0, bottomSpacing = 0): string {
  return `
  <tr>
    <td style="padding:${topSpacing}px 40px ${bottomSpacing}px;" class="ev-hr-td">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="border-top:1px solid ${C.separator};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ── Main shell ─────────────────────────────────────────────────────────────

export interface EditorialEmailOptions {
  title: string
  eyebrow?: string
  // Headline supports \n for intentional line breaks at large size.
  // On mobile the font scales down so breaks reflow naturally.
  headline: string
  subline?: string
  bodyRows: string
  footerNote?: string
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
    .map(esc)
    .join("<br />")

  const sublineHtml = subline
    ? `<p class="ev-subline" style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.46em;text-transform:uppercase;color:${C.muted};">${esc(subline)}</p>`
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
  <title>${esc(title)}</title>
  <style type="text/css">
    ${RESPONSIVE_STYLES}
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${C.bg};"><tr><td align="center"><![endif]-->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${C.bg};">
    <tr>
      <td class="ev-outer-td" align="center" style="padding:32px 16px 48px;">
        <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="640"><tr><td><![endif]-->
        <table class="ev-container" role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background-color:${C.card};" align="center">

          <!-- ── HEADER ── -->
          <tr>
            <td class="ev-header" align="center" style="padding:36px 40px 28px;background-color:${C.card};">
              <p class="ev-eyebrow" style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.52em;text-transform:uppercase;color:${C.muted};">${esc(eyebrow)}</p>
              <h1 class="ev-headline" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:52px;font-weight:400;line-height:0.96;letter-spacing:0.03em;text-transform:uppercase;color:${C.text};">${headlineHtml}</h1>
              ${sublineHtml}
            </td>
          </tr>

          ${bodyRows}

          <!-- ── SIGNATURE ── -->
          ${editorialHrRow()}
          <tr>
            <td class="ev-sig" align="center" style="padding:32px 40px 40px;background-color:${C.card};">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:400;font-style:italic;color:${C.text};letter-spacing:-0.01em;">Sandra x</p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td class="ev-footer" align="center" style="padding:18px 40px 28px;background-color:${C.bg};border-top:1px solid ${C.separator};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${C.muted};">${esc(footerNote)}</p>
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
