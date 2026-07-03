// Vault Flash launch (2026-06) - "The Vault grew. The price follows."
// Honest urgency: the Vault genuinely grew 92 -> 145 prompts, so $27 -> $37 after the window.
// Three touches: announce -> proof -> last call. Sandra-approved copy. No em-dashes, No-Fake.
// These are broadcast-style sends (full list); Sandra fires them, nothing auto-sends.

import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface VaultFlashParams {
  firstName: string
  recipientEmail?: string | null
  /** e.g. "Friday, June 26 at midnight". The real deadline; change freely. */
  deadline?: string
  /** Short day word used in subjects/CTAs, e.g. "Friday". */
  deadlineDay?: string
}

function vaultUrl(campaign: string, content: string, recipientEmail?: string | null): string {
  return buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign,
    content,
    medium: "launch",
    emailType: campaign,
    checkoutEmail: recipientEmail ?? undefined,
  })
}

/** Scannable monochrome price focal block. `upLabel` = when it rises, e.g. "Friday it goes up". */
function priceBlock(upLabel: string): string {
  return `
    <div style="margin:0 0 22px;border:1px solid #C5C6C8;border-radius:8px;padding:22px 18px;text-align:center;">
      <p style="margin:0 0 8px;font-size:34px;font-weight:600;line-height:1;color:#0D0E10;letter-spacing:0.01em;">$27 <span style="font-size:17px;font-weight:400;color:#818283;letter-spacing:0;">then <span style="text-decoration:line-through;">$37</span></span></p>
      <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#818283;">${upLabel} · every future drop included</p>
    </div>`
}

function priceBlockText(upLabel: string): string {
  return `  $27 now, then $37.\n  ${upLabel}. Every future drop included.`
}

export function generateVaultFlashAnnounceEmail({
  firstName,
  recipientEmail,
  deadlineDay = "Friday",
}: VaultFlashParams): { html: string; text: string; subject: string } {
  const url = vaultUrl("vault_flash_announce", "lock_in_27", recipientEmail)
  const subject = `your $27 Vault window (it closes ${deadlineDay})`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">When I opened the Prompt Vault it was a handful of photoshoot worlds. It&apos;s 145 prompts across 18 full collections now, and I add a new shoot most weeks. So the price is finally catching up.</p>
    ${priceBlock(`${deadlineDay} it goes up`)}
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">And it still looks like you, not a filtered stranger. One member, 50 and fabulous: &ldquo;best one so far, I love that it looks real, and me.&rdquo; AI should not erase you. It should frame you.</p>
    <div style="margin:0 0 20px;">${renderStoneButton(`Lock in $27 before ${deadlineDay}`, url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">You were always this woman. Now you&apos;ve got the direction to show her. 🤍</p>
  `

  const html = renderStoneShell({
    title: "The Vault grew. The price follows.",
    eyebrow: "Prompt Vault",
    subtitle: "It went from 92 prompts to 145. Lock in $27 before it moves.",
    bodyHtml,
    footerLead: "One selfie. Every editorial world I've shot.",
    footerSignoff: "Sandra",
  })

  const text = `Hey ${firstName},

When I opened the Prompt Vault it was a handful of photoshoot worlds. It's 145 prompts across 18 full collections now, and I add a new shoot most weeks. So the price is finally catching up.

${priceBlockText(`${deadlineDay} it goes up`)}

And it still looks like you, not a filtered stranger. One member, 50 and fabulous: "best one so far, I love that it looks real, and me." AI should not erase you. It should frame you.

Lock in $27 before ${deadlineDay}:
${url}

You were always this woman. Now you've got the direction to show her.

Sandra`

  return { html, text, subject }
}

export function generateVaultFlashProofEmail({
  firstName,
  recipientEmail,
  deadlineDay = "Friday",
}: VaultFlashParams): { html: string; text: string; subject: string } {
  const url = vaultUrl("vault_flash_proof", "vault_27_until_close", recipientEmail)
  const subject = "the best photo of herself in years"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">A woman wrote to me last week: &ldquo;I just took the best photo of myself in years.&rdquo; She didn&apos;t book a studio or hire anyone. One selfie and a direction from the Vault.</p>
    ${priceBlock(`${deadlineDay} it goes up`)}
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">Another, 50 and fabulous: &ldquo;best one so far, I love that it looks real, and me.&rdquo; That&apos;s the part I care about. Not &ldquo;wow, AI.&rdquo; Just you, on your best day.</p>
    <div style="margin:0 0 20px;">${renderStoneButton("Get the Vault · $27", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Start with one world. See where it goes.</p>
  `

  const html = renderStoneShell({
    title: "She took the best photo of herself in years.",
    eyebrow: "Prompt Vault",
    subtitle: "One selfie. No studio. Still her.",
    bodyHtml,
    footerLead: "$27 until it moves to $37.",
    footerSignoff: "Sandra x",
  })

  const text = `Hey ${firstName},

A woman wrote to me last week: "I just took the best photo of myself in years." She didn't book a studio or hire anyone. One selfie and a direction from the Vault.

${priceBlockText(`${deadlineDay} it goes up`)}

Another, 50 and fabulous: "best one so far, I love that it looks real, and me." That's the part I care about. Not "wow, AI." Just you, on your best day.

Get the Vault · $27:
${url}

Start with one world. See where it goes.

Sandra x`

  return { html, text, subject }
}

export function generateVaultFlashLastCallEmail({
  firstName,
  recipientEmail,
}: VaultFlashParams): { html: string; text: string; subject: string } {
  const url = vaultUrl("vault_flash_lastcall", "lock_in_27_now", recipientEmail)
  const subject = "tonight: $27 becomes $37"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">Last note. The Vault price goes up tonight.</p>
    ${priceBlock("Closes tonight")}
    <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">145 prompts, 18 editorial worlds, every future drop included, and it still looks like you. After tonight it&apos;s $37.</p>
    <div style="margin:0 0 20px;">${renderStoneButton("Lock in $27 now", url)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If checkout gives you any trouble, just reply. A real person answers, usually me.</p>
  `

  const html = renderStoneShell({
    title: "Tonight: $27 becomes $37.",
    eyebrow: "Prompt Vault",
    subtitle: "Last call to lock in $27 forever.",
    bodyHtml,
    footerLead: "145 prompts. 18 worlds. Still you.",
    footerSignoff: "Sandra",
  })

  const text = `Hey ${firstName},

Last note. The Vault price goes up tonight.

${priceBlockText("Closes tonight")}

145 prompts, 18 editorial worlds, every future drop included, and it still looks like you. After tonight it's $37.

Lock in $27 now:
${url}

If checkout gives you any trouble, just reply. A real person answers, usually me.

Sandra`

  return { html, text, subject }
}
