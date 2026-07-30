import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export type VaultMayaWelcomeVariant = "new" | "existing"

export interface VaultMayaWelcomeParams {
  variant: VaultMayaWelcomeVariant
  customerName?: string | null
  customerEmail: string
  /** Required for the "new" variant. */
  passwordSetupUrl?: string
}

export const VAULT_MAYA_WELCOME_SUBJECTS: Record<VaultMayaWelcomeVariant, string> = {
  new: "You're in. Let's create your first photo",
  existing: "Vault Maya is open. Your first photo is one tap away",
}

const MEMBERSHIP_PANEL = `<p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">30 photo creations every month, refreshed on your billing date<br />Unused monthly photos expire when they refresh — top-up credits you purchase never expire<br />Every Vault collection included, new drops every Monday<br />Need more photos? Top up anytime — your membership stays the same<br />Cancel anytime from your account</p>`

const FIRST_PHOTO_STEPS = `<p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">1. Add one clear selfie so Maya can learn what you look like<br />2. Choose a look you love and tap it<br />3. Maya creates your photo — save it or create another</p>`

// Voice pass 2026-07-30: warm, outcome-first, no technical framing.
export function generateVaultMayaWelcomeEmail(params: VaultMayaWelcomeParams): {
  html: string
  text: string
  subject: string
} {
  const { variant, customerName, customerEmail, passwordSetupUrl } = params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const studioUrl = `${siteUrl}/vault-maya/studio`
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })

  const supportLine = `If anything is confusing or a photo doesn't feel right, just reply to this email. A real person answers. Usually me.`
  const creditNote = `If the creation fails before your photo is made, your credit comes back automatically.`

  if (variant === "new") {
    const ctaUrl = passwordSetupUrl || studioUrl
    const ctaLabel = passwordSetupUrl ? "Set your password" : "Open Vault Maya"

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Welcome to Vault Maya. I'm so glad you're here.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's the one thing to do today: create your first photo.</p>
      ${renderStonePanel(FIRST_PHOTO_STEPS, "Your First Photo")}
      ${renderStonePanel(MEMBERSHIP_PANEL, "Your Membership")}
      <div style="margin:26px 0 12px;">${renderStoneButton(ctaLabel, ctaUrl)}</div>
      ${
        passwordSetupUrl
          ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#a8a49c;">Then you land straight in Vault Maya: ${studioUrl}</p>`
          : ""
      }
      <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#a8a49c;">${creditNote}</p>
      <p style="margin:0;font-size:16px;line-height:1.75;">${supportLine}</p>
    `

    const html = renderStoneShell({
      title: "You're in",
      eyebrow: "VAULT MAYA",
      bodyHtml,
    })

    const text = `VAULT MAYA

Hey ${name},

Welcome to Vault Maya. I'm so glad you're here.

Here's the one thing to do today: create your first photo.

Your first photo:
1. Add one clear selfie so Maya can learn what you look like
2. Choose a look you love and tap it
3. Maya creates your photo — save it or create another

Your membership:
30 photo creations every month, refreshed on your billing date
Unused monthly photos expire when they refresh — top-up credits you purchase never expire
Every Vault collection included, new drops every Monday
Need more photos? Top up anytime — your membership stays the same
Cancel anytime from your account

${passwordSetupUrl ? `Set your password: ${ctaUrl}\n\nThen you land straight in Vault Maya: ${studioUrl}` : `Open Vault Maya: ${ctaUrl}`}

${creditNote}

${supportLine}

Sandra x`

    return { html, text, subject: VAULT_MAYA_WELCOME_SUBJECTS.new }
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Vault Maya is open for you. Your first photo is one tap away.</p>
    ${renderStonePanel(FIRST_PHOTO_STEPS, "Your First Photo")}
    ${renderStonePanel(MEMBERSHIP_PANEL, "Your Membership")}
    <div style="margin:26px 0 12px;">${renderStoneButton("Open Vault Maya", studioUrl)}</div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#a8a49c;">${creditNote}</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">${supportLine}</p>
  `

  const html = renderStoneShell({
    title: "Vault Maya is open",
    eyebrow: "VAULT MAYA",
    bodyHtml,
  })

  const text = `VAULT MAYA

Hey ${name},

Vault Maya is open for you. Your first photo is one tap away.

Your first photo:
1. Add one clear selfie so Maya can learn what you look like
2. Choose a look you love and tap it
3. Maya creates your photo — save it or create another

Your membership:
30 photo creations every month, refreshed on your billing date
Unused monthly photos expire when they refresh — top-up credits you purchase never expire
Every Vault collection included, new drops every Monday
Need more photos? Top up anytime — your membership stays the same
Cancel anytime from your account

Open Vault Maya: ${studioUrl}

${creditNote}

${supportLine}

Sandra x`

  return { html, text, subject: VAULT_MAYA_WELCOME_SUBJECTS.existing }
}
