import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsSinglePromptDeliveryParams {
  firstName: string
  promptNumber: string
  promptTitle: string
  promptUrl: string
  promptCheckoutUrl?: string
  promptIntent?: string
}

function promptIntentLine(promptIntent?: string): string {
  switch (promptIntent) {
    case "reel_cover":
      return "Use this one when you need a visual strong enough to carry a reel cover."
    case "content_week":
      return "Use this one as the first image in a small content set, then build the captions around the mood."
    default:
      return "Use this one when you want brand photos that still look like you."
  }
}

export function generateAiPromptsSinglePromptDeliveryEmail(
  params: AiPromptsSinglePromptDeliveryParams,
): { html: string; text: string; subject: string } {
  const subject = `prompt #${params.promptNumber} is here`
  const vaultBridgeHtml = params.promptCheckoutUrl
    ? `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If this is the look you wanted, the Vault is the next step: the full shoot world around this prompt, not one random image.</p>
    <div style="margin:24px 0 26px;">${renderStoneButton("Get the full Vault", params.promptCheckoutUrl)}</div>`
    : ""
  const vaultBridgeText = params.promptCheckoutUrl
    ? `\nIf this is the look you wanted, the Vault is the next step: the full shoot world around this prompt, not one random image.\n\nGet the full Vault:\n${params.promptCheckoutUrl}\n`
    : ""
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${params.firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here it is: prompt #${params.promptNumber}, ${params.promptTitle}.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the page, attach one of your own selfies in ChatGPT, and paste the prompt. It's still you, just in a new light.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${promptIntentLine(params.promptIntent)}</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my prompt", params.promptUrl)}</div>
    ${vaultBridgeHtml}
    <p style="margin:0;font-size:16px;line-height:1.75;">Start with a clear, well-lit selfie. That one thing makes the result feel much more like you.</p>
  `

  const html = renderStoneShell({
    title: `prompt #${params.promptNumber} is here`,
    eyebrow: "SSELFIE",
    subtitle: params.promptTitle,
    bodyHtml,
    footerLead: "Reply if you need me. I read every message.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hey ${params.firstName},

Here it is: prompt #${params.promptNumber}, ${params.promptTitle}.

Open the page, attach one of your own selfies in ChatGPT, and paste the prompt. It's still you, just in a new light.

${promptIntentLine(params.promptIntent)}

Open my prompt:
${params.promptUrl}
${vaultBridgeText}

Start with a clear, well-lit selfie. That one thing makes the result feel much more like you.

Sandra x`

  return { html, text, subject }
}
