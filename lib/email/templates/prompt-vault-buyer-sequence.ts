import { buildRevenueEmailLink } from "./revenue-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

interface PromptVaultBuyerEmailParams {
  firstName: string
  accessUrl: string
}

export function generatePromptVaultDay2FirstResultEmail({
  firstName,
  accessUrl,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_day2",
    content: "open_vault",
    emailType: "prompt-vault-day2-first-result",
  })
  const subject = "Did the first prompt work?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick check. Did you copy one prompt from the vault yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you have not started, use the first Coastal White prompt. It is simple, clean, and easy to judge.</p>
    ${renderStonePanel(
      `<p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Open ChatGPT, upload one clear selfie, paste the prompt, then run it once before you edit anything. The first result tells you what the AI is doing with your face, light, and pose.</p>`,
      "First result rule"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the Vault", vaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If the result looked strange, do not panic. Reply with what happened. Weird outputs are usually fixable.</p>
  `

  const html = renderStoneShell({
    title: "Did the first prompt work?",
    eyebrow: "Prompt Vault",
    subtitle: "Start with one prompt. One selfie. One result.",
    bodyHtml,
    footerLead: "One good result is enough to build from.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

Quick check. Did you copy one prompt from the vault yet?

If you have not started, use the first Coastal White prompt. It is simple, clean, and easy to judge.

First result rule:
Open ChatGPT, upload one clear selfie, paste the prompt, then run it once before you edit anything. The first result tells you what the AI is doing with your face, light, and pose.

Open the Vault:
${vaultUrl}

If the result looked strange, do not panic. Reply with what happened. Weird outputs are usually fixable.

Sandra x`

  return { html, text, subject }
}

export function generatePromptVaultDay5FixBadResultEmail({
  firstName,
  accessUrl,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_day5",
    content: "open_vault",
    emailType: "prompt-vault-day5-fix-bad-result",
  })
  const subject = "If the AI changed your face too much"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The most common problem with AI photos is not the prompt.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is the source photo.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If ChatGPT made your face too smooth, too sharp, or not quite you, try this before you change the whole prompt:</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Use a clearer selfie with soft window light.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Keep your face visible. No heavy shadows, sunglasses, or extreme angles.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Add the anchor line before the prompt if the AI keeps drifting.</p>`,
      "The fix"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the Vault", vaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">The goal is not a perfect fake photo. The goal is a photo that still feels like you.</p>
  `

  const html = renderStoneShell({
    title: "Fix the weird result.",
    eyebrow: "Prompt Vault",
    subtitle: "Most AI photo problems start with the source photo.",
    bodyHtml,
    footerLead: "Better input. Better output. Still you.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

The most common problem with AI photos is not the prompt.

It is the source photo.

If ChatGPT made your face too smooth, too sharp, or not quite you, try this before you change the whole prompt:

The fix:
- Use a clearer selfie with soft window light.
- Keep your face visible. No heavy shadows, sunglasses, or extreme angles.
- Add the anchor line before the prompt if the AI keeps drifting.

Open the Vault:
${vaultUrl}

The goal is not a perfect fake photo. The goal is a photo that still feels like you.

Sandra x`

  return { html, text, subject }
}

export function generatePromptVaultDay10NextShootEmail({
  firstName,
  accessUrl,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_day10",
    content: "open_vault",
    emailType: "prompt-vault-day10-next-shoot",
  })
  const subject = "Your next shoot direction"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">By now you have probably seen what the vault can do.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The next question is not "which prompt is prettiest?"</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The better question is: what do you need these photos to help you say?</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Choose one collection for authority.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Choose one collection for softness and connection.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Choose one collection for your next offer or launch.</p>`,
      "A simple content set"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the Vault", vaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Reply with the collection you used most. That is the signal I want before I build the next paid thing.</p>
  `

  const html = renderStoneShell({
    title: "Your next shoot direction.",
    eyebrow: "Prompt Vault",
    subtitle: "Use the photos for a message, not just a pretty grid.",
    bodyHtml,
    footerLead: "Your best next product should come from what buyers actually use.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

By now you have probably seen what the vault can do.

The next question is not "which prompt is prettiest?"

The better question is: what do you need these photos to help you say?

A simple content set:
- Choose one collection for authority.
- Choose one collection for softness and connection.
- Choose one collection for your next offer or launch.

Open the Vault:
${vaultUrl}

Reply with the collection you used most. That is the signal I want before I build the next paid thing.

Sandra x`

  return { html, text, subject }
}
