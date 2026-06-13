// Vault email drop — buyer update.
//
// Sent to vault owners (source = 'prompt-vault-paid' or email_tags includes
// 'prompt-vault-paid'). Tells them new shoots have been added. Links directly
// to their personal vault access URL — no purchase language anywhere.
//
// Tone: warm, personal, "welcome back." Not a sales email.
// Language: shoots / collections / editorials — NEVER "prompts / bundle / product update"

import {
  editorialClosingRow,
  editorialFinalCTARow,
  editorialHeroRow,
  editorialPullquoteRow,
  editorialSectionTitleRow,
  editorialStoryRow,
  renderEditorialShell,
} from "../editorial-email"
import { buildRevenueEmailLink } from "./revenue-links"
import type { VaultDropCollection } from "../../vault/drop-log"

const VAULT_ACCESS_BASE = "https://www.sselfie.ai/access/prompt-vault"

function vaultAccessUrl(token: string, content: string): string {
  const base = `${VAULT_ACCESS_BASE}/${token}`
  return buildRevenueEmailLink(base, {
    campaign: "vault_drop_buyer",
    content,
    medium: "email-drop",
    emailType: "vault-drop-buyer",
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
            <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.38em;text-transform:uppercase;color:#9B9189;">NEW IN YOUR VAULT</p>
            <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.22;color:#0A0A0A;">${esc(collection.name)}</p>
            <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.75;font-style:italic;color:#9B9189;">${esc(collection.moodLine)}</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#3A3632;">New collection added to your Vault.</p>
          </td>
        </tr>
      </table>`,
    )
    .join("\n")

  return `
  <tr>
    <td style="padding:36px 40px 8px;background:#FFFFFF;border-top:1px solid #E5DDD4;">
      <p style="margin:0 0 26px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">These are already waiting inside your Vault:</p>
      ${rows}
    </td>
  </tr>`
}

export interface VaultDropBuyerParams {
  firstName: string
  accessToken: string
  newCollections: VaultDropCollection[]
}

export function generateVaultDropBuyerEmail({
  firstName,
  accessToken,
  newCollections,
}: VaultDropBuyerParams): {
  subject: string
  html: string
  text: string
  meta: {
    buyerCtaUrl: string
    collectionImageCount: number
  }
} {
  const n = newCollections.length
  const cwCaps = countWordCaps(n) // "Three"

  const subject = `your vault just got bigger`
  const ctaUrl2 = vaultAccessUrl(accessToken, "bottom_cta")

  const heroImage = pickHeroImage(newCollections)

  const bodyRows = [
    editorialHeroRow(heroImage, `${cwCaps} new shoots added to your vault`),

    editorialStoryRow([
      `Hi ${firstName},`,
      "Your vault just got bigger.",
      `${cwCaps} new shoots are live and they are already in your collection. No extra steps. No new link to find. They are just there, waiting for you.`,
      "I tested each of these until I was happy with every single shot direction. The light, the framing, the way you stand. All of it.",
    ]),

    editorialPullquoteRow("You already own this. It just grew."),

    editorialSectionTitleRow("New inside", "YOUR VAULT"),

    collectionCardsRow(newCollections),

    editorialClosingRow([
      "When you are ready, open your vault below.",
      "Pick the shoot that matches the version of you you want to photograph today.",
      "I hope one of these feels like yours.",
    ]),

    editorialFinalCTARow("Open My Vault", ctaUrl2, "Your personal link · All shoots included"),
  ].join("\n")

  const html = renderEditorialShell({
    title: `${cwCaps} New Collections Added · SSELFIE Vault`,
    eyebrow: "SSELFIE VAULT",
    headline: `${cwCaps} New Collections\nAdded`,
    subline: "You already have access.",
    bodyRows,
  })

  const collectionsTextList = newCollections.map((c) => `· ${c.name}`).join("\n")

  const text = `SSELFIE VAULT

${cwCaps.toUpperCase()} NEW COLLECTIONS ADDED

Hi ${firstName},

Your vault just got bigger.

${cwCaps} new shoots are live and they're already in your collection. No extra steps. No new link to find. They're just there, waiting for you.

I tested each of these until I was happy with every single shot direction. The light, the framing, the way you stand. All of it.

You already own this. It just grew.

--- New In Your Vault ---

${cwCaps} new shoots are waiting for you:

${collectionsTextList}

Open your vault. Pick the mood that feels right today. Upload a selfie. That is all it takes.

When you are ready, open your vault below.

Pick the shoot that matches the version of you you want to photograph today.

I hope one of these feels like yours.

OPEN MY VAULT:
${ctaUrl2}

Your personal link · All shoots included

Sandra x`

  return {
    subject,
    html,
    text,
    meta: {
      buyerCtaUrl: ctaUrl2,
      collectionImageCount: newCollections.length,
    },
  }
}
