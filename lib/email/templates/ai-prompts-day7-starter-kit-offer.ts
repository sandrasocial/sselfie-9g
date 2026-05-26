import { getEmailHeroImage } from "../email-image-assets"
import { buildRevenueEmailLink } from "./revenue-links"
import {
  masterclassLandingUrl,
  promptVaultLandingUrl,
  studioLandingUrl,
} from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface AiPromptsDay7Params {
  firstName: string
}

export function generateAiPromptsDay7StarterKitOfferEmail({ firstName }: AiPromptsDay7Params): {
  html: string
  text: string
  subject: string
} {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultLandingUrl(), {
    campaign: "ai_prompts_day7",
    content: "prompt_vault_offer",
    medium: "nurture",
    emailType: "ai-prompts-day7-starter-kit-offer",
  })
  const masterclassUrl = buildRevenueEmailLink(masterclassLandingUrl(), {
    campaign: "ai_prompts_day7",
    content: "masterclass_soft_bridge",
    emailType: "ai-prompts-day7-starter-kit-offer",
  })
  const studioUrl = buildRevenueEmailLink(studioLandingUrl(), {
    campaign: "ai_prompts_day7",
    content: "studio_soft_bridge",
    emailType: "ai-prompts-day7-starter-kit-offer",
  })

  const subject = "Want the full prompt vault?"
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the prompts helped, this is the next step.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The free prompts were the first taste. The Prompt Vault gives you the full editorial collections.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You copy the prompt, open ChatGPT, attach your selfie, and create the kind of brand photos you have been saving for months.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#2c2924;">AI Photo Prompt Vault - $27</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Full copy-paste photoshoot collections for ChatGPT: coastal white dress, marble cafe, denim street, cozy leather, and every angle inside each shoot.</p>`,
      "The next step"
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is for the woman who does not want one random AI photo. She wants a full shoot direction she can actually use.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Vault", promptVaultUrl)}</div>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#7c766d;">If you want the full method later, the Masterclass is here: <a href="${masterclassUrl}" style="color:#2c2924;text-decoration:underline;">see the Masterclass</a>.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#7c766d;">If you want the AI studio too, start here: <a href="${studioUrl}" style="color:#2c2924;text-decoration:underline;">see SSELFIE Studio</a>.</p>
  `

  const html = renderStoneShell({
    title: "Want the full photoshoot vault?",
    eyebrow: "Prompt Vault",
    subtitle: "The free prompts were the taste. The vault is the full shoot.",
    bodyHtml,
    ...heroImage,
    footerLead: "One selfie can become a whole visual direction.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If the prompts helped, this is the next step.

The free prompts were the first taste. The Prompt Vault gives you the full editorial collections.

You copy the prompt, open ChatGPT, attach your selfie, and create the kind of brand photos you have been saving for months.

AI Photo Prompt Vault - $27

Full copy-paste photoshoot collections for ChatGPT: coastal white dress, marble cafe, denim street, cozy leather, and every angle inside each shoot.

It is for the woman who does not want one random AI photo. She wants a full shoot direction she can actually use.

Get the Vault:
${promptVaultUrl}

If you want the full method later, the Masterclass is here:
${masterclassUrl}

If you want the AI studio too, start here:
${studioUrl}

Sandra x`

  return { html, text, subject }
}
