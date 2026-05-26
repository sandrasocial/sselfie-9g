import {
  editorialClosingRow,
  editorialFeatureRow,
  editorialFinalCTARow,
  editorialHeroRow,
  editorialImageBreakRow,
  editorialPhotoGrid,
  editorialPriceCTARow,
  editorialPullquoteRow,
  editorialSectionTitleRow,
  editorialStoryRow,
  renderEditorialShell,
  type GridImage,
} from "../editorial-email"
import { buildRevenueEmailLink } from "./revenue-links"

const VAULT_LANDING = "https://www.sselfie.ai/prompt-vault"

function vaultUrl(campaign: string, content: string): string {
  return buildRevenueEmailLink(VAULT_LANDING, {
    campaign,
    content,
    medium: "broadcast",
    emailType: "prompt-vault-launch-broadcast",
  })
}

export interface PromptVaultLaunchBroadcastParams {
  firstName?: string
}

export function generatePromptVaultLaunchBroadcast({
  firstName = "friend",
}: PromptVaultLaunchBroadcastParams = {}): {
  html: string
  text: string
  subject: string
} {
  const subject = "the vault is live"
  const ctaUrl = vaultUrl("prompt_vault_launch", "main_cta")
  const ctaUrl2 = vaultUrl("prompt_vault_launch", "bottom_cta")

  const gridImages: [GridImage, GridImage, GridImage, GridImage, GridImage, GridImage, GridImage, GridImage, GridImage] = [
    { path: "/images/ai-prompts/marble-wine-shot-1.jpg",    alt: "Marble café editorial. Wine glass, dark blazer, cinematic light." },
    { path: "/images/ai-prompts/coastal-white-shot-1.jpg",  alt: "Coastal editorial. White dress, golden hour, sunset by the water." },
    { path: "/images/ai-prompts/denim-street-shot-5.jpg",   alt: "Street editorial. Soft blazer, light denim, morning light." },
    { path: "/images/ai-prompts/cozy-leather-shot-4.png",   alt: "Mirror editorial. Cozy leather jacket, oversized knit, warm tones." },
    { path: "/images/ai-prompts/marble-wine-shot-5.jpg",    alt: "Marble café editorial. Candlelit, intimate table setting." },
    { path: "/images/ai-prompts/denim-street-shot-1.jpg",   alt: "Street editorial. Denim and blazer, urban backdrop." },
    { path: "/images/ai-prompts/cozy-leather-shot-1.png",   alt: "Mirror editorial. Leather and knit, full-length self-portrait." },
    { path: "/images/ai-prompts/coastal-white-shot-3.jpg",  alt: "Coastal editorial. White dress, natural light, ocean backdrop." },
    { path: "/images/ai-prompts/denim-street-shot-9.jpg",   alt: "Street editorial. Confident pose, soft denim, city light." },
  ]

  // ── Collections list (inline HTML — no helper needed) ──────────────────────
  const collectionsRow = `
  <tr>
    <td style="padding:36px 40px 16px;background:#FFFFFF;border-top:1px solid #E5DDD4;">
      <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">Four collections are in the vault right now:</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>Coastal White Dress Sunset Editorial</td></tr>
        <tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>Marble Caf&eacute; Wine Editorial</td></tr>
        <tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>Soft Blazer + Light Denim Street Editorial</td></tr>
        <tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>Cozy Leather + Oversized Knit Mirror Editorial</td></tr>
      </table>
      <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">New collections drop as I test them. You pay once and keep everything that comes after.</p>
    </td>
  </tr>`

  // ── Body rows ────────────────────────────────────────────────────────────

  const bodyRows = [
    editorialHeroRow("/images/ai-prompts/ai-prompts-hero.jpg", "Sandra"),

    editorialStoryRow([
      `Hi ${firstName},`,
      "There is a version of you living somewhere in the photos you have been saving for months.",
      "Not a fantasy version. Not someone else entirely. Just you. Photographed in a way that finally matches how you actually see yourself in your best moments.",
      "The problem is not that those photos are impossible. The problem is that nobody ever showed you how to get them.",
      "I have spent the past year testing AI photoshoot prompts on myself. What I kept finding is this: the gap between a beautiful result and a generic one has nothing to do with the AI. It has everything to do with the direction you give it.",
      "Most people open ChatGPT, type something vague, and get something forgettable. That is not an AI problem. That is a prompt problem.",
    ]),

    editorialPullquoteRow("The vault is the direction."),

    editorialPriceCTARow("Get the Vault", ctaUrl, "Now live for $27"),

    editorialSectionTitleRow("Inside", "THE VAULT"),

    editorialPhotoGrid(gridImages),

    editorialFeatureRow(
      [
        "Prompt collections",
        "Creative direction",
        "Example images",
        "Full shoot series",
        "Growing collection",
      ],
      "Not just random prompts.",
      "Four full editorial photoshoot directions: the mood, the styling, the setting, and every shot in the series. Each prompt has an example image so you know exactly what you are creating before you copy it.",
    ),

    collectionsRow,

    editorialImageBreakRow("/images/ai-prompts/marble-wine-shot-4.jpg", "Marble café editorial. Wide cinematic shot."),

    editorialClosingRow([
      "You open ChatGPT. You upload one selfie. You paste the prompt. That is the whole process.",
      "The AI handles the transformation. The vault handles the direction. You just have to start with one photo and one prompt.",
      "That is enough.",
    ]),

    editorialFinalCTARow("Get the Vault", ctaUrl2, "$27 · Instant access · Grows with every new collection"),
  ].join("\n")

  const html = renderEditorialShell({
    title: "The Vault Is Live · SSELFIE",
    eyebrow: "SSELFIE",
    headline: "The Vault Is\nOfficially Live",
    subline: "AI photoshoot prompts that make you feel like her again",
    bodyRows,
  })

  const text = `SSELFIE

THE VAULT IS OFFICIALLY LIVE
AI photoshoot prompts that make you feel like her again.

Hi ${firstName},

There is a version of you living somewhere in the photos you have been saving for months.

Not a fantasy version. Not someone else entirely. Just you. Photographed in a way that finally matches how you actually see yourself in your best moments.

The problem is not that those photos are impossible. The problem is that nobody ever showed you how to get them.

I have spent the past year testing AI photoshoot prompts on myself. What I kept finding is this: the gap between a beautiful result and a generic one has nothing to do with the AI. It has everything to do with the direction you give it.

Most people open ChatGPT, type something vague, and get something forgettable. That is not an AI problem. That is a prompt problem.

The vault is the direction.

GET THE VAULT — $27:
${ctaUrl}

--- Inside The Vault ---

Four full editorial photoshoot directions — the mood, the styling, the setting, and every shot in the series. Each prompt has an example image so you know exactly what you are creating before you copy it.

Four collections in the vault right now:

· Coastal White Dress Sunset Editorial
· Marble Café Wine Editorial
· Soft Blazer + Light Denim Street Editorial
· Cozy Leather + Oversized Knit Mirror Editorial

New collections drop as I test them. You pay once and keep everything that comes after.

You open ChatGPT. You upload one selfie. You paste the prompt. That is the whole process.

The AI handles the transformation. The vault handles the direction. You just have to start with one photo and one prompt.

That is enough.

GET THE VAULT:
${ctaUrl2}

$27 · Instant access · Grows with every new collection

Sandra x

---

You are receiving this because you signed up at sselfie.ai. Reply to unsubscribe.`

  return { html, text, subject }
}
