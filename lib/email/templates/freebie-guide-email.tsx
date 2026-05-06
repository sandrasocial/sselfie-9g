import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your free guide is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is not just a selfie guide anymore. It is the first step in the SSELFIE path: take one phone photo and turn it into a post that says something.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Start here:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">1. Take the photo<br />2. Give the post a job<br />3. Write the caption<br />4. Turn it into your first visible post</p>`,
      "Your first visible post",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the guide", guideAccessLink)}</div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#a8a49c;">After you finish the guide, the natural next step is the Starter Kit if you want your first 7 days of content, or the Visibility Suite if you want the full What To Say, Show Up, Get Paid path.</p>
  `

  const html = renderStoneShell({
    title: "Your guide is ready",
    eyebrow: "SSELFIE",
    subtitle: "Take one phone photo and turn it into a post with a job.",
    bodyHtml,
    footerLead: "Start small. One photo. One post. One next step.",
  })

  const text = `SSELFIE

Hey ${firstName},

Your free guide is ready.

This is not just a selfie guide anymore. It is the first step in the SSELFIE path: take one phone photo and turn it into a post that says something.

Start here:
1. Take the photo
2. Give the post a job
3. Write the caption
4. Turn it into your first visible post

Open the guide:
${guideAccessLink}

After you finish the guide, the natural next step is the Starter Kit if you want your first 7 days of content, or the Visibility Suite if you want the full What To Say, Show Up, Get Paid path.

Start small. One photo. One post. One next step.

Sandra`

  return { html, text }
}
