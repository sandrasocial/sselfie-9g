import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay1VaultBridgeParams {
  firstName: string
  recipientEmail?: string | null
  accessUrl: string
}

export function generateAiPromptsDay1VaultBridgeEmail({
  firstName,
  accessUrl,
}: AiPromptsDay1VaultBridgeParams): { html: string; text: string; subject: string } {
  const subject = "did you try one yet?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Yesterday I sent you the selfie prompts. Did you try one?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, start small. Open the page, choose Clean Editorial, and use one clear selfie in soft window light.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need to create a whole brand today. You only need one photo that makes you think, there I am.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Try one prompt", accessUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Try one before you decide you need anything else.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">If the result looks strange, reply and tell me what changed. I&apos;ll help you find the next step.</p>
  `

  const html = renderStoneShell({
    title: "Try one first.",
    eyebrow: "AI Photoshoot Prompts",
    subtitle: "One clear selfie. One prompt. One useful result.",
    bodyHtml,
    footerLead: "You do not need to do all of it today.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${firstName},

Yesterday I sent you the selfie prompts. Did you try one?

If not, start small. Open the page, choose Clean Editorial, and use one clear selfie in soft window light.

You do not need to create a whole brand today. You only need one photo that makes you think, there I am.

Try one prompt:
${accessUrl}

Try one before you decide you need anything else.

If the result looks strange, reply and tell me what changed. I'll help you find the next step.

Sandra`

  return { html, text, subject }
}
