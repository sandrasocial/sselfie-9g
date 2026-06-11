import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export type MembershipWelcomeVariant = "new" | "existing"

export interface MembershipWelcomeParams {
  variant: MembershipWelcomeVariant
  customerName?: string | null
  customerEmail: string
  /** Required for the "new" variant. */
  passwordSetupUrl?: string
}

export const MEMBERSHIP_WELCOME_SUBJECTS: Record<MembershipWelcomeVariant, string> = {
  new: "You're in. Let's make your first photos today",
  existing: "Your SUITE is open. Maya's ready when you are",
}

// Copy approved by Sandra 2026-06-11 (tasks/BRIDGE-01-suite-bridge.md, Appendix 1.1 + 1.2).
export function generateMembershipWelcomeEmail(params: MembershipWelcomeParams): {
  html: string
  text: string
  subject: string
} {
  const { variant, customerName, customerEmail, passwordSetupUrl } = params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const appUrl = `${siteUrl}/app`
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })

  if (variant === "new") {
    const ctaUrl = passwordSetupUrl || appUrl
    const ctaLabel = passwordSetupUrl ? "Set your password" : "Open your Studio"

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Welcome to the SUITE. I'm so glad you're here.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's the one thing to do today: meet Maya. She's your creative director. She already has looks pulled for you. You pick one, she shows you three concepts, and your first photos are done in minutes. No prompts to write. Nothing to figure out.</p>
      ${renderStonePanel(
        `<p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">200 photos a month<br />Every product I've ever made, included<br />Cancel anytime</p>`,
        "Your Membership",
      )}
      <div style="margin:26px 0 12px;">${renderStoneButton(ctaLabel, ctaUrl)}</div>
      ${
        passwordSetupUrl
          ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#a8a49c;">Then you land straight in your Studio.</p>`
          : ""
      }
      <p style="margin:0;font-size:16px;line-height:1.75;">One promise before you start: these photos will look like you. Not a filtered stranger. AI should not erase you. It should frame you.</p>
    `

    const html = renderStoneShell({
      title: "You're in",
      eyebrow: "SSELFIE SUITE",
      bodyHtml,
    })

    const text = `SSELFIE SUITE

Hey ${name},

Welcome to the SUITE. I'm so glad you're here.

Here's the one thing to do today: meet Maya. She's your creative director. She already has looks pulled for you. You pick one, she shows you three concepts, and your first photos are done in minutes. No prompts to write. Nothing to figure out.

Your membership:
200 photos a month
Every product I've ever made, included
Cancel anytime

${passwordSetupUrl ? `Set your password: ${ctaUrl}\n\nThen you land straight in your Studio.` : `Open your Studio: ${ctaUrl}`}

One promise before you start: these photos will look like you. Not a filtered stranger. AI should not erase you. It should frame you.

Sandra`

    return { html, text, subject: MEMBERSHIP_WELCOME_SUBJECTS.new }
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You're a member now. That changes what you have access to, so here's the short version:</p>
    ${renderStonePanel(
      `<p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Maya, your creative director, in the Studio app<br />200 photos a month<br />The Prompt Vault, the Starter Kit, and the Masterclass, all open<br />Everything new I make</p>`,
      "Now Included With Your Membership",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The thing I'd do first: open the app and pick a look. Maya shows you three concepts and your first photos are done in minutes.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Studio", appUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Everything just opened",
    eyebrow: "SSELFIE SUITE",
    bodyHtml,
  })

  const text = `SSELFIE SUITE

Hey ${name},

You're a member now. That changes what you have access to, so here's the short version:

Now included with your membership:
Maya, your creative director, in the Studio app
200 photos a month
The Prompt Vault, the Starter Kit, and the Masterclass, all open
Everything new I make

The thing I'd do first: open the app and pick a look. Maya shows you three concepts and your first photos are done in minutes.

Open your Studio: ${appUrl}

Sandra`

  return { html, text, subject: MEMBERSHIP_WELCOME_SUBJECTS.existing }
}
