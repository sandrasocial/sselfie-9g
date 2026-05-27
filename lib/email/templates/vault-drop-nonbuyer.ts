// Vault email drop — non-buyer upsell.
//
// Sent to freebie subscribers who have NOT yet purchased the vault.
// Copy scales automatically to the number of new collections (2, 3, or more).
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

// Returns "two", "three", "four", or the digit for larger counts.
function countWord(n: number): string {
  const words: Record<number, string> = { 2: "two", 3: "three", 4: "four", 5: "five" }
  return words[n] ?? String(n)
}
function countWordCaps(n: number): string {
  const w = countWord(n)
  return w.charAt(0).toUpperCase() + w.slice(1)
}

export interface VaultDropNonbuyerParams {
  firstName: string
  newCollections: VaultDropCollection[]
}

export function generateVaultDropNonbuyerEmail({
  firstName,
  newCollections,
}: VaultDropNonbuyerParams): {
  subject: string
  html: string
  text: string
} {
  const n = newCollections.length
  const cw = countWord(n)         // "three"
  const cwCaps = countWordCaps(n) // "Three"

  const subject = `${cw} new shoots just dropped`
  const ctaUrl = vaultUrl("main_cta")
  const ctaUrl2 = vaultUrl("bottom_cta")

  // Hero: first new collection. Break image: third (or second if only 2).
  const heroImage = newCollections[0]?.heroImage ?? "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg"
  const breakImage =
    newCollections[2]?.heroImage ??
    newCollections[1]?.heroImage ??
    newCollections[0]?.heroImage ??
    "/images/ai-prompts/coastal-white-shot-1.jpg"

  // Collections list
  const collectionRows = newCollections
    .map(
      (c) =>
        `<tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>${c.name}</td></tr>`,
    )
    .join("\n        ")

  const newShootsRow = `
  <tr>
    <td style="padding:36px 40px 16px;background:#FFFFFF;border-top:1px solid #E5DDD4;">
      <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">${cwCaps} new shoots just landed in the vault:</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        ${collectionRows}
      </table>
      <p style="margin:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;font-style:italic;color:#9B9189;">Inside each one: the full shoot direction, every scene, the styling, the mood. Everything you need to walk into ChatGPT and come out with photos you actually want to post.</p>
    </td>
  </tr>`

  const bodyRows = [
    editorialHeroRow(heroImage, `${cwCaps} new editorial shoots in the vault`),

    editorialStoryRow([
      `Hi ${firstName},`,
      `${cwCaps} new shoots just dropped in the vault.`,
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
    title: `${cwCaps} New Shoots Just Dropped · SSELFIE Vault`,
    eyebrow: "SSELFIE VAULT",
    headline: `${cwCaps} New Shoots\nJust Dropped`,
    subline: "Shot 1 from each is yours. The full shoots are inside the Vault.",
    bodyRows,
  })

  const collectionsTextList = newCollections.map((c) => `· ${c.name}`).join("\n")

  const text = `SSELFIE VAULT

${cwCaps.toUpperCase()} NEW SHOOTS JUST DROPPED

Hi ${firstName},

${cwCaps} new shoots just dropped in the vault.

I've been testing these for weeks. Not just once or twice but until I knew exactly how to describe the light, the framing, the styling, the mood. Until the result felt like a real photoshoot, not a filter.

That work is done. Now it is yours.

She is not out of reach. She is one shoot away.

GET THE VAULT — $27:
${ctaUrl}

--- What Just Dropped ---

${cwCaps} new shoots just landed in the vault:

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
