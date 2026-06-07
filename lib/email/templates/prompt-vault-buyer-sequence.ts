import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

interface PromptVaultBuyerEmailParams {
  firstName: string
  accessUrl: string
  recipientEmail?: string | null
}

function promptVaultTokenFromAccessUrl(accessUrl: string): string | null {
  try {
    const url = new URL(accessUrl, "https://www.sselfie.ai")
    const parts = url.pathname.split("/").filter(Boolean)
    const token = parts[parts.length - 1]
    return token && token !== "prompt-vault" ? token : null
  } catch {
    const token = accessUrl.split("/").filter(Boolean).pop()
    return token && token !== "prompt-vault" ? token : null
  }
}

function buildSystemUpgradeUrl(accessUrl: string): string {
  const token = promptVaultTokenFromAccessUrl(accessUrl)
  const checkout = new URL(selfieToBrandShootCheckoutUrl())
  checkout.searchParams.set("source", "prompt_vault_buyer_email")
  checkout.searchParams.set("utm_source", "email")
  checkout.searchParams.set("utm_medium", "lifecycle")
  checkout.searchParams.set("utm_campaign", "prompt_vault_system_upgrade")
  checkout.searchParams.set("utm_content", "vault_buyer_credit")
  checkout.searchParams.set("email_type", "prompt-vault-day3-system-upgrade")
  checkout.searchParams.set("buyer_stage", "micro")
  checkout.searchParams.set("vault_credit", "1")
  if (token) checkout.searchParams.set("freebie_token", token)
  return checkout.toString()
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

export function generatePromptVaultDay3SystemUpgradeEmail({
  firstName,
  accessUrl,
  recipientEmail,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const upgradeUrl = buildRevenueEmailLink(buildSystemUpgradeUrl(accessUrl), {
    campaign: "prompt_vault_system_upgrade",
    content: "vault_buyer_credit",
    emailType: "prompt-vault-day3-system-upgrade",
    checkoutEmail: recipientEmail,
  })
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_system_upgrade",
    content: "open_vault",
    emailType: "prompt-vault-day3-system-upgrade",
  })
  const subject = "your Vault credit is waiting"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault gives you the shoot directions. The full Selfie to Brand Shoot System shows you how to turn those images into a recognizable personal brand.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Because you already bought the Vault, your $27 is credited toward the System.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Inside the System, you choose the right source selfie, lock one signature visual world, build your first prompts, filter the images that still look like you, and turn the shoot into a 7-day content plan.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">It is the guided path around the Vault, not another folder of prompts.</p>`,
      "Your next step"
    )}
    <div style="margin:26px 0 16px;">${renderStoneButton("Complete the System for $170", upgradeUrl)}</div>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#5f5a52;">Or keep using your Vault first: <a href="${vaultUrl}" style="color:#2c2924;text-decoration:underline;">open your prompts here</a>.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Start simple. One clear selfie, one visual world, one first week of content.</p>
  `

  const html = renderStoneShell({
    title: "Complete the full system.",
    eyebrow: "Selfie to Brand Shoot",
    subtitle: "Your Vault purchase is credited toward the guided path.",
    bodyHtml,
    footerLead: "The Vault is included. The System gives it direction.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

The Vault gives you the shoot directions. The full Selfie to Brand Shoot System shows you how to turn those images into a recognizable personal brand.

Because you already bought the Vault, your $27 is credited toward the System.

Inside the System, you choose the right source selfie, lock one signature visual world, build your first prompts, filter the images that still look like you, and turn the shoot into a 7-day content plan.

Complete the System for $170:
${upgradeUrl}

Or keep using your Vault first:
${vaultUrl}

Start simple. One clear selfie, one visual world, one first week of content.

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
