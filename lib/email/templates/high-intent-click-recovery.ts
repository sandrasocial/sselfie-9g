import { renderPersonalLink, renderPersonalNote } from "@/lib/email/templates/stone-email"

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

export type HighIntentProduct = "prompt_vault" | "starter_kit"

export const HIGH_INTENT_EMAIL_TYPES: Record<HighIntentProduct, string> = {
  prompt_vault: "high-intent-click-prompt-vault",
  starter_kit: "high-intent-click-starter-kit",
}

export function generateHighIntentClickRecoveryEmail(input: {
  product: HighIntentProduct
  firstName?: string | null
}) {
  const firstName = input.firstName?.trim() || "there"

  if (input.product === "prompt_vault") {
    const ctaUrl = `${SITE_URL}/checkout/prompt-vault?utm_source=email&utm_medium=lifecycle&utm_campaign=high_intent_click_recovery&utm_content=prompt_vault_fit`
    const subject = "if you're still deciding about the Vault"
    const text = [
      `Hey ${firstName},`,
      "",
      "There is one thing I want to make really clear about the Prompt Vault, because I never want someone buying it expecting the wrong thing.",
      "",
      "It is not a magic button that creates 237 photos for you.",
      "",
      "You still choose your selfie, open ChatGPT, and copy and paste the prompt you want to use.",
      "",
      "What you are paying for is the part that usually eats the time: deciding what to create, building the shoot idea, and figuring out how to describe the photo well enough to get a useful result.",
      "",
      "If the five free prompts are giving you everything you need right now, genuinely keep using them. You do not need the Vault yet.",
      "",
      "If you keep needing new photos and finding yourself back at a blank prompt every time, that is when the Vault makes sense.",
      "",
      "It is 31 complete shoot collections, 237 prompts, and the new prompt drops I add. $37 once.",
      "",
      `See the Prompt Vault: ${ctaUrl}`,
      "",
      "Sandra x",
    ].join("\n")

    const html = renderPersonalNote({
      title: subject,
      bodyHtml: [
        `<p style="margin:0 0 18px;">Hey ${firstName},</p>`,
        `<p style="margin:0 0 18px;">There is one thing I want to make really clear about the Prompt Vault, because I never want someone buying it expecting the wrong thing.</p>`,
        `<p style="margin:0 0 18px;">It is not a magic button that creates 237 photos for you.</p>`,
        `<p style="margin:0 0 18px;">You still choose your selfie, open ChatGPT, and copy and paste the prompt you want to use.</p>`,
        `<p style="margin:0 0 18px;">What you are paying for is the part that usually eats the time: deciding what to create, building the shoot idea, and figuring out how to describe the photo well enough to get a useful result.</p>`,
        `<p style="margin:0 0 18px;">If the five free prompts are giving you everything you need right now, genuinely keep using them. You do not need the Vault yet.</p>`,
        `<p style="margin:0 0 18px;">If you keep needing new photos and finding yourself back at a blank prompt every time, that is when the Vault makes sense.</p>`,
        `<p style="margin:0 0 18px;">It is 31 complete shoot collections, 237 prompts, and the new prompt drops I add. $37 once.</p>`,
        `<p style="margin:24px 0 0;">${renderPersonalLink("See the Prompt Vault · $37", ctaUrl)}</p>`,
      ].join(""),
    })

    return { subject, html, text, ctaUrl }
  }

  const ctaUrl = `${SITE_URL}/checkout/starter-kit?utm_source=email&utm_medium=lifecycle&utm_campaign=high_intent_click_recovery&utm_content=starter_kit_fit`
  const subject = "before you decide on the Starter Kit"
  const text = [
    `Hey ${firstName},`,
    "",
    "A quick note about the Selfie Starter, because it is easy to assume every SSELFIE product is about AI now.",
    "",
    "This one is not.",
    "",
    "The Starter is for the real photo first: light, angle, pose, editing, presets, and knowing what to do with the photo once you have it.",
    "",
    "If your biggest problem is that you still do not like the normal photos you take of yourself, this is the place I would start before worrying about AI.",
    "",
    "If you already know how to take and edit photos you love, you probably do not need it.",
    "",
    "But if taking one usable photo still turns into 100 attempts and a camera roll you never post, that is exactly the problem the Starter is meant to fix.",
    "",
    "It is $37 once.",
    "",
    `See the Selfie Starter: ${ctaUrl}`,
    "",
    "Sandra x",
  ].join("\n")

  const html = renderPersonalNote({
    title: subject,
    bodyHtml: [
      `<p style="margin:0 0 18px;">Hey ${firstName},</p>`,
      `<p style="margin:0 0 18px;">A quick note about the Selfie Starter, because it is easy to assume every SSELFIE product is about AI now.</p>`,
      `<p style="margin:0 0 18px;">This one is not.</p>`,
      `<p style="margin:0 0 18px;">The Starter is for the real photo first: light, angle, pose, editing, presets, and knowing what to do with the photo once you have it.</p>`,
      `<p style="margin:0 0 18px;">If your biggest problem is that you still do not like the normal photos you take of yourself, this is the place I would start before worrying about AI.</p>`,
      `<p style="margin:0 0 18px;">If you already know how to take and edit photos you love, you probably do not need it.</p>`,
      `<p style="margin:0 0 18px;">But if taking one usable photo still turns into 100 attempts and a camera roll you never post, that is exactly the problem the Starter is meant to fix.</p>`,
      `<p style="margin:0 0 18px;">It is $37 once.</p>`,
      `<p style="margin:24px 0 0;">${renderPersonalLink("See the Selfie Starter · $37", ctaUrl)}</p>`,
    ].join(""),
  })

  return { subject, html, text, ctaUrl }
}
