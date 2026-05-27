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
  editorialImageBreakRow,
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
} {
  const subject = `your vault just got bigger`
  const ctaUrl2 = vaultAccessUrl(accessToken, "bottom_cta")

  // Hero and break images from the new collections
  const heroImage = newCollections[0]?.heroImage ?? "/images/ai-prompts/dark-balcony-shot-1.png"
  const breakImage = newCollections[1]?.heroImage ?? newCollections[0]?.heroImage ?? "/images/ai-prompts/coastal-white-shot-1.jpg"

  // New collections list
  const collectionRows = newCollections
    .map(
      (c) =>
        `<tr><td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3A3632;"><span style="color:#9B9189;margin-right:12px;">&middot;</span>${c.name}</td></tr>`,
    )
    .join("\n        ")

  const newShootsRow = `
  <tr>
    <td style="padding:36px 40px 16px;background:#FFFFFF;border-top:1px solid #E5DDD4;">
      <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.9;color:#0A0A0A;">Two new shoots are waiting for you:</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        ${collectionRows}
      </table>
      <p style="margin:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;font-style:italic;color:#9B9189;">Open your vault. Pick the mood that feels right today. Upload a selfie. That is all it takes.</p>
    </td>
  </tr>`

  const bodyRows = [
    editorialHeroRow(heroImage, "New shoots added to your vault"),

    editorialStoryRow([
      `Hi ${firstName},`,
      "Your vault just got bigger.",
      "Two new shoots are live and they are already in your collection. No extra steps. No new link to find. They are just there, waiting for you.",
      "I tested each of these until I was happy with every single shot direction. The light, the framing, the way you stand. All of it.",
    ]),

    editorialPullquoteRow("You already own this. It just grew."),

    editorialSectionTitleRow("New in", "YOUR VAULT"),

    newShootsRow,

    editorialImageBreakRow(breakImage, "New shoot preview"),

    editorialClosingRow([
      "When you are ready, open your vault below.",
      "Pick the shoot that matches the version of you you want to photograph today.",
      "I hope one of these feels like yours.",
    ]),

    editorialFinalCTARow("Open My Vault", ctaUrl2, "Your personal link · All shoots included"),
  ].join("\n")

  const html = renderEditorialShell({
    title: "Your Vault Just Got Bigger · SSELFIE",
    eyebrow: "SSELFIE VAULT",
    headline: "Your Vault\nJust Got Bigger",
    subline: "Two new shoots are waiting for you",
    bodyRows,
  })

  const collectionsTextList = newCollections.map((c) => `· ${c.name}`).join("\n")

  const text = `SSELFIE VAULT

YOUR VAULT JUST GOT BIGGER

Hi ${firstName},

Your vault just got bigger.

Two new shoots are live and they're already in your collection. No extra steps. No new link to find. They're just there, waiting for you.

I tested each of these until I was happy with every single shot direction. The light, the framing, the way you stand. All of it.

You already own this. It just grew.

--- New In Your Vault ---

Two new shoots are waiting for you:

${collectionsTextList}

Open your vault. Pick the mood that feels right today. Upload a selfie. That is all it takes.

When you are ready, open your vault below.

Pick the shoot that matches the version of you you want to photograph today.

I hope one of these feels like yours.

OPEN MY VAULT:
${ctaUrl2}

Your personal link · All shoots included

Sandra x`

  return { subject, html, text }
}
