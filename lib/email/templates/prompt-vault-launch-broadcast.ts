import {
  editorialCTA,
  editorialFeatureRow,
  editorialHeroRow,
  editorialImg,
  editorialPhotoGrid,
  renderEditorialShell,
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

  // ── Body rows ────────────────────────────────────────────────────────────

  const bodyRows = `

    ${editorialHeroRow("/images/ai-prompts/ai-prompts-hero.jpg", "Sandra")}

    <!-- Opening copy -->
    <tr>
      <td style="padding:44px 40px 0;background:#FFFFFF;">
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">Hi ${firstName},</p>
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">There is a version of you living somewhere in the photos you have been saving for months.</p>
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">Not a fantasy version. Not someone else entirely. Just you — photographed in a way that finally matches how you actually see yourself in your best moments.</p>
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">The problem is not that those photos are impossible. The problem is that nobody ever showed you how to get them.</p>
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">I have spent the past year testing AI photoshoot prompts on myself. What I kept finding is this: the gap between a beautiful result and a generic one has nothing to do with the AI. It has everything to do with the direction you give it.</p>
        <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">Most people open ChatGPT, type something vague, and get something forgettable. That is not an AI problem. That is a prompt problem.</p>
      </td>
    </tr>

    <!-- Pull quote -->
    <tr>
      <td style="padding:0 40px 32px;background:#FFFFFF;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="padding:24px 28px;border-left:3px solid #0A0A0A;background:#FAF8F4;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;font-style:italic;line-height:1.65;color:#0A0A0A;">The vault is the direction.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- First CTA -->
    <tr>
      <td style="padding:0 40px 44px;background:#FFFFFF;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="padding-right:22px;">
              ${editorialCTA("Get the Vault", ctaUrl)}
            </td>
            <td>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;color:#9B9189;">Now live for $27</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Section heading: Inside The Vault -->
    <tr>
      <td align="center" style="padding:28px 40px;background:#FAF8F4;border-top:1px solid #E5DDD4;">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#0A0A0A;letter-spacing:0.01em;"><em>Inside</em> THE VAULT</p>
      </td>
    </tr>

    ${editorialPhotoGrid([
      "/images/ai-prompts/marble-wine-shot-1.jpg",
      "/images/ai-prompts/coastal-white-shot-1.jpg",
      "/images/ai-prompts/denim-street-shot-5.jpg",
      "/images/ai-prompts/cozy-leather-shot-4.png",
      "/images/ai-prompts/marble-wine-shot-5.jpg",
      "/images/ai-prompts/denim-street-shot-1.jpg",
      "/images/ai-prompts/cozy-leather-shot-1.png",
      "/images/ai-prompts/coastal-white-shot-3.jpg",
      "/images/ai-prompts/denim-street-shot-9.jpg",
    ])}

    ${editorialFeatureRow(
      [
        "Prompt collections",
        "Creative direction",
        "Example images",
        "Full shoot series",
        "Growing collection",
      ],
      "Not just random prompts.",
      "Four full editorial photoshoot directions — the mood, the styling, the setting, and every shot in the series. Each prompt has an example image so you know exactly what you are creating before you copy it.",
    )}

    <!-- Collections list -->
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
    </tr>

    <!-- Wide image break -->
    <tr>
      <td style="padding:28px 0 0;background:#FFFFFF;line-height:0;font-size:0;">
        ${editorialImg("/images/ai-prompts/marble-wine-shot-4.jpg", "")}
      </td>
    </tr>

    <!-- Closing copy -->
    <tr>
      <td style="padding:40px 40px 36px;background:#FFFFFF;">
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">You open ChatGPT. You upload one selfie. You paste the prompt. That is the whole process.</p>
        <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#3A3632;">The AI handles the transformation. The vault handles the direction. You just have to start with one photo and one prompt.</p>
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">That is enough.</p>
      </td>
    </tr>

    <!-- Final CTA -->
    <tr>
      <td style="padding:0 40px 48px;background:#FFFFFF;">
        ${editorialCTA("Get the Vault", ctaUrl2, true)}
        <p style="margin:14px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B9189;letter-spacing:0.06em;">$27 &middot; Instant access &middot; Grows with every new collection</p>
      </td>
    </tr>
  `

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

Not a fantasy version. Not someone else entirely. Just you — photographed in a way that finally matches how you actually see yourself in your best moments.

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
