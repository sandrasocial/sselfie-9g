// Vault email drop - non-buyer upsell.
//
// Sent to freebie subscribers who have NOT yet purchased the vault.
// Copy scales automatically to the number of new collections (2, 3, or more).
//
// Tone: intimate, feminine, warm. "I want to become this version of myself."
// Language: shoots / collections / editorials - NEVER "prompts / bundle / product update"

import {
  editorialClosingRow,
  editorialFinalCTARow,
  editorialHeroRow,
  editorialPriceCTARow,
  editorialPullquoteRow,
  editorialSectionTitleRow,
  editorialStoryRow,
  renderEditorialShell,
} from "../editorial-email"
import type { VaultDropCollection } from "../../vault/drop-log"

const VAULT_CHECKOUT = "https://www.sselfie.ai/checkout/prompt-vault"
const FREE_PROMPTS_BASE = "https://www.sselfie.ai/ai-prompts"
const FREE_PROMPTS_ACCESS_BASE = "https://www.sselfie.ai/ai-prompts/access"

function vaultUrl(): string {
  const url = new URL(VAULT_CHECKOUT)
  url.searchParams.set("utm_source", "resend")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", "vault_collection_drop")
  url.searchParams.set("utm_content", "non_buyer")
  url.searchParams.set("checkout_source", "email_vault_collection_drop")
  return url.toString()
}

function previewUrl(accessToken: string | null | undefined, content: string): string {
  const base = accessToken
    ? `${FREE_PROMPTS_ACCESS_BASE}/${encodeURIComponent(accessToken)}`
    : FREE_PROMPTS_BASE

  const url = new URL(base)
  url.searchParams.set("source", "resend")
  url.searchParams.set("utm_source", "resend")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", "vault_collection_drop")
  url.searchParams.set("utm_content", content)
  url.searchParams.set("email_type", "vault-drop-nonbuyer")
  return url.toString()
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

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function imgSrc(path: string): string {
  return path.startsWith("http") ? path : `https://www.sselfie.ai${path}`
}

function collectionImage(collection: VaultDropCollection): string {
  return collection.heroImage || "/images/ai-prompts/dark-balcony-shot-1.png"
}

function pickHeroImage(collections: VaultDropCollection[]): string {
  return collections.find((collection) => Boolean(collection.heroImage))?.heroImage ?? "/images/ai-prompts/dark-balcony-shot-1.png"
}

function collectionCardsRow(collections: VaultDropCollection[]): string {
  const rows = collections
    .map(
      (collection) => `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;border-bottom:1px solid #E5DDD4;">
        <tr>
          <td style="padding:0 0 18px;line-height:0;font-size:0;">
            <img src="${esc(imgSrc(collectionImage(collection)))}" alt="${esc(collection.name)}" width="560" style="display:block;width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 26px;">
            <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.38em;text-transform:uppercase;color:#9B9189;">NEW SHOOT</p>
            <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.22;color:#0A0A0A;">${esc(collection.name)}</p>
            <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.75;font-style:italic;color:#9B9189;">${esc(collection.moodLine)}</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#3A3632;">Shot 1 is yours. The full shoot is inside the Vault.</p>
          </td>
        </tr>
      </table>`,
    )
    .join("\n")

  return `
  <tr>
    <td style="padding:36px 40px 8px;background:#FFFFFF;border-top:1px solid #E5DDD4;">
      <p style="margin:0 0 26px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">Your preview now has one image from each new shoot:</p>
      ${rows}
    </td>
  </tr>`
}

export interface VaultDropNonbuyerParams {
  firstName: string
  newCollections: VaultDropCollection[]
  accessToken?: string | null
}

export function generateVaultDropNonbuyerEmail({
  firstName,
  newCollections,
  accessToken,
}: VaultDropNonbuyerParams): {
  subject: string
  html: string
  text: string
  meta: {
    primaryCtaUrl: string
    secondaryCtaUrl: string
    collectionImageCount: number
  }
} {
  const n = newCollections.length
  const cw = countWord(n)         // "three"
  const cwCaps = countWordCaps(n) // "Three"

  const subject = `${cw} new shoots just dropped`
  const primaryCtaUrl = previewUrl(accessToken, "updated_preview")
  const secondaryCtaUrl = vaultUrl()

  const heroImage = pickHeroImage(newCollections)

  const bodyRows = [
    editorialHeroRow(heroImage, `${cwCaps} new editorial shoots in the vault`),

    editorialStoryRow([
      `Hi ${firstName},`,
      `${cwCaps} new shoots just dropped, and your free preview has been updated.`,
      "I have been testing these for weeks. Not just once or twice but until I knew exactly how to describe the light, the framing, the styling, the mood. Until the result felt like a real photoshoot, not a filter.",
      "Shot 1 from each new shoot is yours now.",
    ]),

    editorialPullquoteRow("She is not out of reach. She is one shoot away."),

    editorialPriceCTARow("Open Your Updated Preview", primaryCtaUrl, "Shot 1 from each new shoot is yours"),

    editorialSectionTitleRow("Inside your", "UPDATED PREVIEW"),

    collectionCardsRow(newCollections),

    editorialClosingRow([
      "The preview gives you the first image from each new shoot.",
      "The full Vault gives you the full shoot direction, every scene, the styling, the mood, and every copy-paste prompt.",
      "Open it once. Pick a shoot. Upload a selfie. That is the whole process.",
    ]),

    editorialFinalCTARow("Get the Vault for $37", secondaryCtaUrl, "$37 · Instant access · Every full shoot included"),
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

OPEN YOUR UPDATED PREVIEW:
${primaryCtaUrl}

--- Inside Your Updated Preview ---

Your preview now has one image from each new shoot:

${collectionsTextList}

Shot 1 is yours. The full shoots are inside the Vault.

The preview gives you the first image from each new shoot.

The full Vault gives you the full shoot direction, every scene, the styling, the mood, and every copy-paste prompt.

GET THE VAULT FOR $37:
${secondaryCtaUrl}

$37 · Instant access · Every shoot included

Sandra x`

  return {
    subject,
    html,
    text,
    meta: {
      primaryCtaUrl,
      secondaryCtaUrl,
      collectionImageCount: newCollections.length,
    },
  }
}
