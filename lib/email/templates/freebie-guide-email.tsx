import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface FreebieGuideEmailParams {
  firstName: string
  email: string
  guideAccessLink: string
}

export function generateFreebieGuideEmail(params: FreebieGuideEmailParams): {
  html: string
  text: string
} {
  const { firstName, guideAccessLink } = params

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here it is.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your free guide", guideAccessLink)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Start with the light section. That is the fastest win.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra</p>
  `

  const html = renderStoneShell({
    title: "Your free guide is here",
    eyebrow: "SSELFIE",
    subtitle: "Start with the light section.",
    bodyHtml,
    footerLead: "Start with the fastest win.",
    footerSignoff: "",
  })

  const text = `SSELFIE

Hey ${firstName},

Here it is.

Open your free guide:
${guideAccessLink}

Start with the light section. That is the fastest win.

Sandra`

  return { html, text }
}
