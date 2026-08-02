import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export type VaultMayaWelcomeVariant = "new" | "existing"

export interface VaultMayaWelcomeParams {
  variant: VaultMayaWelcomeVariant
  customerName?: string | null
  customerEmail: string
  /** Required for the "new" variant. */
  passwordSetupUrl?: string
}

export const VAULT_MAYA_WELCOME_SUBJECTS: Record<VaultMayaWelcomeVariant, string> = {
  new: "Your Vault Maya membership is ready",
  existing: "Your Vault Maya membership is ready",
}

const HERO_IMAGE =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785423447575-876892.png"

const MEMBERSHIP_DETAILS = `Your membership includes 30 photo creations every month, refreshed on your billing date. Unused monthly photos expire when they refresh. Any top-up credits you purchase never expire.`

const FAILED_CREATION_NOTE = `If a creation fails before your photo is made, your credit comes back automatically.`

const ACCOUNT_NOTE = `You can top up, manage or cancel your membership from Account & billing inside Vault Maya.`

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
  const supportLine = `If anything feels confusing, just reply to this email. I will help you.`

  if (variant === "new") {
    const ctaUrl = passwordSetupUrl || studioUrl
    const ctaLabel = passwordSetupUrl ? "Create my password" : "Open Vault Maya"

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your Vault Maya membership is ready.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Start with one clear selfie. Choose the photo you want, and Maya will create it for you.</p>
      ${
        passwordSetupUrl
          ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Create your password first. Then you will land inside Vault Maya and can make your first photo.</p>`
          : ""
      }
      <div style="margin:26px 0 12px;">${renderStoneButton(ctaLabel, ctaUrl)}</div>
      ${
        passwordSetupUrl
          ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.75;color:#818283;">Keep this email so you can find Vault Maya again anytime: <a href="${studioUrl}" style="color:#282728;text-decoration:underline;">open Vault Maya</a>.</p>`
          : ""
      }
      <p style="margin:28px 0 12px;padding-top:22px;border-top:1px solid #D8D9DA;font-size:14px;line-height:1.8;color:#818283;">${MEMBERSHIP_DETAILS}</p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#818283;">${FAILED_CREATION_NOTE}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.8;color:#818283;">${ACCOUNT_NOTE}</p>
      <p style="margin:0;font-size:16px;line-height:1.75;">${supportLine}</p>
    `

    const html = renderStoneShell({
      title: "Your membership is ready",
      eyebrow: "VAULT MAYA",
      bodyHtml,
      heroImageUrl: HERO_IMAGE,
      heroImageAlt: "Golden-hour balcony portrait ready to create inside Vault Maya",
    })

    const text = `VAULT MAYA

Hey ${name},

Your Vault Maya membership is ready.

Start with one clear selfie. Choose the photo you want, and Maya will create it for you.

${passwordSetupUrl ? `Create your password first. Then you will land inside Vault Maya and can make your first photo.

Create my password: ${ctaUrl}` : `Open Vault Maya: ${ctaUrl}`}

${passwordSetupUrl ? `Keep this email so you can find Vault Maya again anytime: ${studioUrl}` : ""}

${MEMBERSHIP_DETAILS}

${FAILED_CREATION_NOTE}

${ACCOUNT_NOTE}

${supportLine}

Sandra x`

    return { html, text, subject: VAULT_MAYA_WELCOME_SUBJECTS.new }
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your Vault Maya membership is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Start with one clear selfie. Choose the photo you want, and Maya will create it for you.</p>
    <div style="margin:26px 0 12px;">${renderStoneButton("Open Vault Maya", studioUrl)}</div>
    <p style="margin:28px 0 12px;padding-top:22px;border-top:1px solid #D8D9DA;font-size:14px;line-height:1.8;color:#818283;">${MEMBERSHIP_DETAILS}</p>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#818283;">${FAILED_CREATION_NOTE}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.8;color:#818283;">${ACCOUNT_NOTE}</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">${supportLine}</p>
  `

  const html = renderStoneShell({
    title: "Your membership is ready",
    eyebrow: "VAULT MAYA",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour balcony portrait ready to create inside Vault Maya",
  })

  const text = `VAULT MAYA

Hey ${name},

Your Vault Maya membership is ready.

Start with one clear selfie. Choose the photo you want, and Maya will create it for you.

Open Vault Maya: ${studioUrl}

${MEMBERSHIP_DETAILS}

${FAILED_CREATION_NOTE}

${ACCOUNT_NOTE}

${supportLine}

Sandra x`

  return { html, text, subject: VAULT_MAYA_WELCOME_SUBJECTS.existing }
}
