// Vault email drop — non-buyer upsell.
//
// Sent to freebie subscribers (source = 'ai-prompts') who have NOT yet
// purchased the vault. Emotional, cinematic. Announces new shoots have
// dropped. CTA goes to /prompt-vault landing page.
//
// Tone: intimate, feminine, warm. "I want to become this version of myself."
// Language: shoots / collections / editorials — NEVER "prompts / bundle / product update"

import {
  editorialClosingRow,
  editorialFinalCTARow,
  editorialHeroRow,
  editorialImageBreakRow,
  editorialPriceCTARow,
  editorialPullquoteRow,
  editorialSectionTitleRow,
  editorialStoryRow,
  renderEditorialShell,
} from "../editorial-email"
import { buildRevenueEmailLink } from "./revenue-links"
import type { VaultDropCollection } from "../../vault/drop-log"

const VAULT_LANDING = "https://www.sselfie.ai/prompt-vault"

function vaultUrl(content: string): string {
  return buildRevenueEmailLink(VAULT_LANDING, {
    campaign: "vault_drop",
    content,
    medium: "email-drop",
    emailType: "vault-drop-nonbuyer",
  })
}

export interface VaultDropNonbuyerParams {
  firstName: string
  newCollections: VaultDropCollection[]
  dropLabel: string
}

export function generateVaultDropNonbuyerEmail({
  firstName,
  newCollections,
  dropLabel,
}: VaultDropNonbuyerParams): {
  subject: string
  html: string
  text: string
} {
  const subject = `new shoots just dropped inside the vault`
  const ctaUrl = vaultUrl("main_cta")
  const ctaUrl2 = vaultUrl("bottom_cta")

  // Hero image: first new collection's hero
  const heroImage = newCollections[0]?.heroImage ?? "/images/ai-prompts/dark-balcony-shot-1.png"
  // Break image: second new collection's hero (fallback to same if only one)
  const breakImage = newCollections[1]?.heroImage ?? newCollections[0]?.heroImage ?? "/images/ai-prompts/coastal-white-shot-1.jpg"

  // New collections list — inline HTML so we control exactly what gets shown
  const collectionRows = newCollections
    .map(
      (c) =>
        `<tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>${c.name}</td></tr>`,
    )
    .join("\n        ")

  const newShootsRow = `
  <tr>
    <td style="padding:36px 40px 16px;background:#FFFFFF;border-top:1px solid #E5DDD4;">
      <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">Two new shoots just landed in the vault:</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        ${collectionRows}
      </table>
      <p style="margin:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;font-style:italic;color:#9B9189;">Inside each one: the full shoot direction, every scene, the styling, the mood. Everything you need to walk into ChatGPT and come out with photos you actually want to post.</p>
    </td>
  </tr>`

  const bodyRows = [
    editorialHeroRow(heroImage, "New editorial shoots in the vault"),

    editorialStoryRow([
      `Hi ${firstName},`,
      "Two new shoots just dropped in the vault.",
      "I have been testing these for weeks. Not just once or twice but until I knew exactly how to describe the light, the framing, the styling, the mood. Until the result felt like a real photoshoot, not a filter.",
      "That work is done. Now it is yours.",
    ]),

    editorialPullquoteRow("She is not out of reach. She is one shoot away."),

    editorialPriceCTARow("Get the Vault", ctaUrl, "One payment · $27 · Keeps growing"),

    editorialSectionTitleRow("What just", "DROPPED"),

    newShootsRow,

    editorialImageBreakRow(breakImage, "New shoot preview"),

    editorialClosingRow([
      "You already have the free shoot.",
      "You have seen what one prompt can do with a single selfie.",
      "The vault is the same thing, but for every version of you you have been wanting to photograph.",
      "Open it once. Pick a shoot. Upload a selfie. That is the whole process.",
    ]),

    editorialFinalCTARow("Open the Vault", ctaUrl2, "$27 · Instant access · Every shoot included"),
  ].join("\n")

  const html = renderEditorialShell({
    title: `${dropLabel} · SSELFIE Vault`,
    eyebrow: "SSELFIE VAULT",
    headline: "Two New Shoots\nJust Dropped",
    subline: "Your AI photoshoot collection just got bigger",
    bodyRows,
  })

  const collectionsTextList = newCollections.map((c) => `· ${c.name}`).join("\n")

  const text = `SSELFIE VAULT

TWO NEW SHOOTS JUST DROPPED

Hi ${firstName},

Two new shoots just dropped in the vault.

I've been testing these for weeks. Not just once or twice but until I knew exactly how to describe the light, the framing, the styling, the mood. Until the result felt like a real photoshoot, not a filter.

That work is done. Now it is yours.

She is not out of reach. She is one shoot away.

GET THE VAULT — $27:
${ctaUrl}

--- What Just Dropped ---

Two new shoots just landed in the vault:

${collectionsTextList}

Inside each one: the full shoot direction, every scene, the styling, the mood. Everything you need to walk into ChatGPT and come out with photos you actually want to post.

You already have the free shoot.

You've seen what one prompt can do with a single selfie.

The vault is the same thing, but for every version of you you've been wanting to photograph.

Open it once. Pick a shoot. Upload a selfie. That is the whole process.

OPEN THE VAULT:
${ctaUrl2}

$27 · Instant access · Every shoot included

Sandra x`

  return { subject, html, text }
}
