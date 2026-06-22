// Vault Flash launch (2026-06) — "The Vault grew. The price follows."
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

export function generateVaultFlashAnnounceEmail({
  firstName,
  recipientEmail,
  deadline = "Friday, June 26 at midnight",
  deadlineDay = "Friday",
}: VaultFlashParams): { html: string; text: string; subject: string } {
  const url = vaultUrl("vault_flash_announce", "lock_in_27", recipientEmail)
  const subject = `your $27 Vault window (it closes ${deadlineDay})`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick, honest one.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">When I opened the Prompt Vault, it was a handful of photoshoot worlds. As of today it&apos;s 145 prompts across 18 full collections, and I add a new shoot most weeks.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">So the price is finally catching up to what&apos;s inside. ${deadline}, the Vault goes from $27 to $37.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Join before then and you lock in $27, forever, with every future drop included. Buy nothing twice.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">And if you&apos;re wondering whether the results actually look like you, not some filtered stranger: one member, 50 and fabulous, told me &ldquo;best one so far, I love that it looks real, and me.&rdquo; That&apos;s the whole point. AI should not erase you. It should frame you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One selfie. Every editorial world I&apos;ve shot. Yours for good.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton(`Lock in $27 before ${deadlineDay}`, url)}</div>
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

Quick, honest one.

When I opened the Prompt Vault, it was a handful of photoshoot worlds. As of today it's 145 prompts across 18 full collections, and I add a new shoot most weeks.

So the price is finally catching up to what's inside. ${deadline}, the Vault goes from $27 to $37.

Join before then and you lock in $27, forever, with every future drop included. Buy nothing twice.

And if you're wondering whether the results actually look like you, not some filtered stranger: one member, 50 and fabulous, told me "best one so far, I love that it looks real, and me." That's the whole point. AI should not erase you. It should frame you.

One selfie. Every editorial world I've shot. Yours for good.

Lock in $27 before ${deadlineDay}:
${url}

You were always this woman. Now you've got the direction to show her.

Sandra`

  return { html, text, subject }
}

export function generateVaultFlashProofEmail({
  firstName,
  recipientEmail,
  deadline = "Friday, June 26 at midnight",
  deadlineDay = "Friday",
}: VaultFlashParams): { html: string; text: string; subject: string } {
  const url = vaultUrl("vault_flash_proof", "vault_27_until_close", recipientEmail)
  const subject = "the best photo of herself in years"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">A woman wrote to me last week. She said: &ldquo;I just took the best photo of myself in years.&rdquo;</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">She didn&apos;t book a studio. She didn&apos;t hire anyone. One selfie and a direction from the Vault.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Another, 50 and fabulous: &ldquo;Best one so far. I love that it looks real, and me.&rdquo; And a self-described picky one: &ldquo;I&apos;m so picky it&apos;s not even funny. But this, my God, I&apos;m blown away.&rdquo;</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That&apos;s the part I care about most. Not &ldquo;wow, AI.&rdquo; But &ldquo;that&apos;s me, on my best day.&rdquo;</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault is 145 prompts now, 18 worlds, and it goes to $37 ${deadline}. Until then it&apos;s $27, locked in forever.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton(`Get the Vault · $27 (until ${deadlineDay})`, url)}</div>
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

A woman wrote to me last week. She said: "I just took the best photo of myself in years."

She didn't book a studio. She didn't hire anyone. One selfie and a direction from the Vault.

Another, 50 and fabulous: "Best one so far. I love that it looks real, and me." And a self-described picky one: "I'm so picky it's not even funny. But this, my God, I'm blown away."

That's the part I care about most. Not "wow, AI." But "that's me, on my best day."

The Vault is 145 prompts now, 18 worlds, and it goes to $37 ${deadline}. Until then it's $27, locked in forever.

Get the Vault · $27 (until ${deadlineDay}):
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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Last note. Tonight the Vault goes from $27 to $37.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you were waiting for a reason: 145 prompts, 18 editorial worlds, every future drop included, and it still looks like you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">After tonight, $37. Right now, $27, locked in forever.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Lock in $27 now", url)}</div>
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

Last note. Tonight the Vault goes from $27 to $37.

If you were waiting for a reason: 145 prompts, 18 editorial worlds, every future drop included, and it still looks like you.

After tonight, $37. Right now, $27, locked in forever.

Lock in $27 now:
${url}

If checkout gives you any trouble, just reply. A real person answers, usually me.

Sandra`

  return { html, text, subject }
}
