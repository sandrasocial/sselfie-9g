/* eslint-disable no-restricted-syntax -- Email clients require inline absolute colors. */
import {
  escapeHtml,
  renderPersonalLink,
  renderPersonalNote,
  renderStoneButton,
  renderStonePanel,
  renderStoneShell,
} from "./stone-email"

export type VaultMayaMarketingEmailId =
  | "suite-included"
  | "buyer-announcement"
  | "list-announcement"
  | "inside-look"
  | "proof"
  | "likeness"
  | "use-cases"
  | "founder-close"
  | "founder-final-day"
  | "founder-final-hours"
  | "first-photo-nudge"

export const VAULT_MAYA_FIRST_PHOTO_NUDGE_EMAIL_TYPE = "vault_maya_first_photo_nudge"

export interface VaultMayaMarketingEmail {
  id: VaultMayaMarketingEmailId
  subject: string
  html: string
  text: string
}

interface SharedParams {
  firstName?: string
}

interface ProofParams extends SharedParams {
  collectionName?: string
  proofImageUrl?: string
}

interface FounderCloseParams extends SharedParams {
  founderDeadline: string
}

const SITE_URL = "https://www.sselfie.ai"
const HERO_IMAGE =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785423447575-876892.png"
const INSIDE_IMAGE =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785427595205-824538.png"
const LIKENESS_IMAGE =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785421185459-170116.png"
const USE_CASE_IMAGE =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785419807908-245517.png"
const RESEND_UNSUBSCRIBE_URL = "{{{RESEND_UNSUBSCRIBE_URL}}}"

const BANNED_PROMISES = {
  support: "If you have a question, reply to this email. I will help you.",
  founder: "Keep $19/month for as long as your membership stays active.",
}

function hello(firstName?: string): string {
  const name = firstName?.trim() || "there"
  return `Hey ${escapeHtml(name)},`
}

function paragraph(copy: string, extraStyle = ""): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.8;${extraStyle}">${copy}</p>`
}

function marketingFooter(reason: string): string {
  return `<p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #D8D9DA;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;">${escapeHtml(reason)}<br /><a href="${RESEND_UNSUBSCRIBE_URL}" style="color:#4F5052;text-decoration:underline;">Unsubscribe</a></p>`
}

function withTracking(path: string, campaign: string): string {
  const url = new URL(path, SITE_URL)
  url.searchParams.set("utm_source", "email")
  url.searchParams.set("utm_medium", "launch")
  url.searchParams.set("utm_campaign", campaign)
  return url.toString()
}

export function generateVaultMayaSuiteIncludedEmail(
  params: SharedParams = {}
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya/studio", "vault_maya_suite_included")
  const subject = "Vault Maya is now inside your SUITE"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph(
      "When you joined SSELFIE SUITE, I promised that the new products I create would be included for you."
    ),
    paragraph("Vault Maya is one of them, and it is ready now."),
    paragraph(
      "Choose a photoshoot from the Vault, add your selfies and Maya will create the photos for you. Your finished photos stay together in your own gallery."
    ),
    paragraph("There is nothing extra to buy. It is already part of your membership."),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Open Vault Maya", ctaUrl)}</div>`,
    paragraph("I would love for you to try one look and tell me how it feels."),
    marketingFooter("You are receiving this because you are a SSELFIE SUITE member."),
  ].join("")

  const html = renderStoneShell({
    title: "Something new is waiting for you",
    eyebrow: "INSIDE YOUR SUITE",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour editorial portrait from the SSELFIE Vault",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

When you joined SSELFIE SUITE, I promised that the new products I create would be included for you.

Vault Maya is one of them, and it is ready now.

Choose a photoshoot from the Vault, add your selfies and Maya will create the photos for you. Your finished photos stay together in your own gallery.

There is nothing extra to buy. It is already part of your membership.

Open Vault Maya: ${ctaUrl}

I would love for you to try one look and tell me how it feels.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "suite-included", subject, html, text }
}

export function generateVaultMayaBuyerAnnouncementEmail(
  params: SharedParams = {}
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_buyers")
  const subject = "I made the Prompt Vault even easier"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("You already have my prompts, so you know how good the photos can be."),
    paragraph(
      "But some days you do not want to copy a prompt or work out what to type. You just want the photo."
    ),
    paragraph("That is why I created Vault Maya."),
    paragraph(
      "Add one clear selfie, or a few different angles if you want. Choose the photo you love and Maya creates it for you. The complete Vault is inside, with a new photoshoot every Monday."
    ),
    paragraph(
      "Your Prompt Vault is still yours forever. Vault Maya is simply another way to create the same looks when you want Maya to do the prompting for you."
    ),
    renderStonePanel(
      `${paragraph("30 photo creations every month.", "margin-bottom:8px;")}${paragraph("Founder price: $19/month. After the founder launch, it will be $29/month for new members.", "margin-bottom:8px;")}${paragraph(BANNED_PROMISES.founder, "margin-bottom:0;")}`,
      "FOUNDER PRICE"
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("See Vault Maya", ctaUrl)}</div>`,
    paragraph(BANNED_PROMISES.support),
    marketingFooter(
      "You are receiving this because you previously bought a SSELFIE photo product."
    ),
  ].join("")

  const html = renderStoneShell({
    title: "The Vault, created for you",
    eyebrow: "MEET VAULT MAYA",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour editorial portrait from the SSELFIE Vault",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

You already have my prompts, so you know how good the photos can be.

But some days you do not want to copy a prompt or work out what to type. You just want the photo.

That is why I created Vault Maya.

Add one clear selfie, or a few different angles if you want. Choose the photo you love and Maya creates it for you. The complete Vault is inside, with a new photoshoot every Monday.

Your Prompt Vault is still yours forever. Vault Maya is simply another way to create the same looks when you want Maya to do the prompting for you.

30 photo creations every month. Founder price: $19/month. After the founder launch, it will be $29/month for new members. ${BANNED_PROMISES.founder}

See Vault Maya: ${ctaUrl}

${BANNED_PROMISES.support}

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "buyer-announcement", subject, html, text }
}

export function generateVaultMayaListAnnouncementEmail(
  params: SharedParams = {}
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_list")
  const subject = "I made something new for your AI photos"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph(
      "For months I have been creating complete AI photoshoots and sharing the prompts so you can make the photos with your own selfie."
    ),
    paragraph("Now I have made an easier way to create them."),
    paragraph(
      "It is called Vault Maya. Add one clear selfie, or a few different angles if you want. Choose the photo you love and Maya creates it for you. You do not need to copy a prompt or work out what to type."
    ),
    paragraph(
      "Every Vault collection is inside. New photoshoots arrive every Monday, and your finished photos stay together in your own gallery."
    ),
    renderStonePanel(
      `${paragraph("30 photo creations every month.", "margin-bottom:8px;")}${paragraph("Founder price: $19/month. After the founder launch, it will be $29/month for new members.", "margin-bottom:8px;")}${paragraph(BANNED_PROMISES.founder, "margin-bottom:0;")}`,
      "FOUNDER PRICE"
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("See Vault Maya", ctaUrl)}</div>`,
    paragraph(
      "Already inside SSELFIE SUITE? Vault Maya is included in your membership. Open your Library or go straight to Vault Maya. There is nothing extra to buy."
    ),
    paragraph(BANNED_PROMISES.support),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "Choose the photo. Maya creates it.",
    eyebrow: "MEET VAULT MAYA",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour editorial portrait from the SSELFIE Vault",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

For months I have been creating complete AI photoshoots and sharing the prompts so you can make the photos with your own selfie.

Now I have made an easier way to create them.

It is called Vault Maya. Add one clear selfie, or a few different angles if you want. Choose the photo you love and Maya creates it for you. You do not need to copy a prompt or work out what to type.

Every Vault collection is inside. New photoshoots arrive every Monday, and your finished photos stay together in your own gallery.

30 photo creations every month. Founder price: $19/month. After the founder launch, it will be $29/month for new members. ${BANNED_PROMISES.founder}

See Vault Maya: ${ctaUrl}

Already inside SSELFIE SUITE? Vault Maya is included in your membership. There is nothing extra to buy.

${BANNED_PROMISES.support}

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "list-announcement", subject, html, text }
}

export function generateVaultMayaInsideLookEmail(
  params: SharedParams = {}
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_inside")
  const subject = "This is how Vault Maya works"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("I want to show you exactly what happens after you join."),
    paragraph(
      "You open a photoshoot and see every photo in the collection. Choose the one you want, add your selfies and Maya creates your version."
    ),
    paragraph(
      "You do not need to copy a prompt or explain the outfit, pose, location or light. The photo you choose already gives Maya that direction."
    ),
    renderStonePanel(
      `${paragraph("Every current Vault collection is ready to create.", "margin-bottom:8px;")}${paragraph("You receive 30 photo creations every month.", "margin-bottom:8px;")}${paragraph("A new photoshoot arrives every Monday.", "margin-bottom:0;")}`,
      "INSIDE YOUR MEMBERSHIP"
    ),
    paragraph(
      "Your finished photos stay together in your own gallery, so you can see what you have already created and save the ones you love."
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("See inside Vault Maya", ctaUrl)}</div>`,
    paragraph("Founder price: $19/month. You keep that price while your membership stays active."),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "Choose the photo you want",
    eyebrow: "INSIDE VAULT MAYA",
    bodyHtml,
    heroImageUrl: INSIDE_IMAGE,
    heroImageAlt: "Editorial mirror portrait ready to create inside Vault Maya",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

I want to show you exactly what happens after you join.

You open a photoshoot and see every photo in the collection. Choose the one you want, add your selfies and Maya creates your version.

You do not need to copy a prompt or explain the outfit, pose, location or light. The photo you choose already gives Maya that direction.

Every current Vault collection is ready to create. You receive 30 photo creations every month. A new photoshoot arrives every Monday.

Your finished photos stay together in your own gallery, so you can see what you have already created and save the ones you love.

See inside Vault Maya: ${ctaUrl}

Founder price: $19/month. You keep that price while your membership stays active.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "inside-look", subject, html, text }
}

export function generateVaultMayaProofEmail(params: ProofParams = {}): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_proof")
  const collectionName = escapeHtml(params.collectionName?.trim() || "[collection name]")
  const hasApprovedProof = Boolean(params.proofImageUrl)
  const subject = "This is what one selfie can become"
  const proofBlock = hasApprovedProof
    ? ""
    : renderStonePanel(
        paragraph(
          "Sandra: choose one real Vault Maya result and add the collection name before this email can be approved or sent.",
          "margin-bottom:0;"
        ),
        "PROOF IMAGE NEEDED"
      )
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("I want to show you the part that matters."),
    paragraph(
      `This is one of the photos inside ${collectionName}. In Vault Maya, you choose the photo, add your selfies and Maya creates your version.`
    ),
    paragraph(
      "The goal is not to turn you into somebody else. It is to help you create a beautiful photo where you still recognise yourself."
    ),
    proofBlock,
    paragraph(
      "Inside Vault Maya, you can open a collection, choose the exact photo you want and keep every finished image in your own gallery."
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Choose my first photo", ctaUrl)}</div>`,
    paragraph(
      "The founder price is $19/month during the launch, and you keep that price while your membership stays active."
    ),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "A photo I would actually use",
    eyebrow: "FROM THE VAULT",
    bodyHtml,
    heroImageUrl: params.proofImageUrl,
    heroImageAlt: hasApprovedProof
      ? `Photo from the ${params.collectionName || "selected"} photoshoot inside Vault Maya`
      : undefined,
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

I want to show you the part that matters.

This is one of the photos inside ${params.collectionName?.trim() || "[collection name]"}. In Vault Maya, you choose the photo, add your selfies and Maya creates your version.

The goal is not to turn you into somebody else. It is to help you create a beautiful photo where you still recognise yourself.

${hasApprovedProof ? "" : "[Sandra: add one approved real Vault Maya result before sending.]\n\n"}Inside Vault Maya, you can open a collection, choose the exact photo you want and keep every finished image in your own gallery.

Choose my first photo: ${ctaUrl}

The founder price is $19/month during the launch, and you keep that price while your membership stays active.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "proof", subject, html, text }
}

export function generateVaultMayaLikenessEmail(params: SharedParams = {}): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_likeness")
  const subject = "Will the photo still look like me?"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("This is the question I would ask too."),
    paragraph(
      "Vault Maya uses your selfies to understand you. You can add up to four clear photos, including another angle or a full-body photo, so Maya has more of your real features to work from."
    ),
    paragraph(
      "The Vault photo guides the outfit, pose, location and light. It is not used as your identity."
    ),
    paragraph(
      "AI can still change a small detail or give you a result that does not feel quite right. If that happens, you can try the look again with another selfie, mark the photo as Not quite, or reply and I will help you."
    ),
    paragraph(
      "The goal is simple: beautiful photos where you still recognise yourself and feel comfortable using them."
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Choose a photo to create", ctaUrl)}</div>`,
    paragraph("Founder price: $19/month during the launch."),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "Beautiful photos. Still recognisably you.",
    eyebrow: "THE QUESTION I WOULD ASK",
    bodyHtml,
    heroImageUrl: LIKENESS_IMAGE,
    heroImageAlt: "Golden-hour close-up from the SSELFIE Vault",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

This is the question I would ask too.

Vault Maya uses your selfies to understand you. You can add up to four clear photos, including another angle or a full-body photo, so Maya has more of your real features to work from.

The Vault photo guides the outfit, pose, location and light. It is not used as your identity.

AI can still change a small detail or give you a result that does not feel quite right. If that happens, you can try the look again with another selfie, mark the photo as Not quite, or reply and I will help you.

The goal is simple: beautiful photos where you still recognise yourself and feel comfortable using them.

Choose a photo to create: ${ctaUrl}

Founder price: $19/month during the launch.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "likeness", subject, html, text }
}

export function generateVaultMayaUseCasesEmail(params: SharedParams = {}): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_use_cases")
  const subject = "What would you create first?"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("Maybe you need a new profile photo."),
    paragraph(
      "Maybe you have something important to say, but you keep putting off the post because you do not have a photo you want to use."
    ),
    paragraph(
      "Or maybe you simply want a beautiful photo of yourself that does not need a studio day, a photographer or a perfect setup."
    ),
    paragraph(
      "That is what Vault Maya is for. Open a photoshoot, choose the exact photo you want and create it with the selfies you already have."
    ),
    renderStonePanel(
      `${paragraph("A profile photo.", "margin-bottom:8px;")}${paragraph("Fresh photos for your content.", "margin-bottom:8px;")}${paragraph("A complete collection that feels connected.", "margin-bottom:0;")}`,
      "START WITH WHAT YOU NEED"
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Find my first photo", ctaUrl)}</div>`,
    paragraph(
      "You receive 30 photo creations each month. Founder price: $19/month during the launch."
    ),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "Start with the photo you need now",
    eyebrow: "VAULT MAYA",
    bodyHtml,
    heroImageUrl: USE_CASE_IMAGE,
    heroImageAlt: "Editorial rooftop portrait ready to create inside Vault Maya",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

Maybe you need a new profile photo.

Maybe you have something important to say, but you keep putting off the post because you do not have a photo you want to use.

Or maybe you simply want a beautiful photo of yourself that does not need a studio day, a photographer or a perfect setup.

That is what Vault Maya is for. Open a photoshoot, choose the exact photo you want and create it with the selfies you already have.

Start with what you need: a profile photo, fresh photos for your content, or a complete collection that feels connected.

Find my first photo: ${ctaUrl}

You receive 30 photo creations each month. Founder price: $19/month during the launch.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "use-cases", subject, html, text }
}

export function generateVaultMayaFounderCloseEmail(
  params: FounderCloseParams
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_close")
  const deadline = escapeHtml(params.founderDeadline)
  const subject = "The Vault Maya founder price ends tomorrow"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("A quick reminder before the Vault Maya founder launch ends."),
    paragraph(
      `The $19/month founder price ends ${deadline}. Vault Maya will stay open, but the price will be $29/month for new members after that.`
    ),
    paragraph(
      "If you join during the founder launch, you keep $19/month for as long as your membership stays active."
    ),
    paragraph(
      "You will get every Vault collection ready to create, 30 photo creations each month, your own gallery and a new photoshoot every Monday."
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Join at the founder price", ctaUrl)}</div>`,
    paragraph(
      "If now is not the right time, that is completely okay. The free prompts and the Prompt Vault are still there whenever you want to create in ChatGPT."
    ),
    paragraph(BANNED_PROMISES.support),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "$19 ends tomorrow",
    eyebrow: "VAULT MAYA",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour editorial portrait from the SSELFIE Vault",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

A quick reminder before the Vault Maya founder launch ends.

The $19/month founder price ends ${params.founderDeadline}. Vault Maya will stay open, but the price will be $29/month for new members after that.

If you join during the founder launch, you keep $19/month for as long as your membership stays active.

You will get every Vault collection ready to create, 30 photo creations each month, your own gallery and a new photoshoot every Monday.

Join at the founder price: ${ctaUrl}

If now is not the right time, that is completely okay. The free prompts and the Prompt Vault are still there whenever you want to create in ChatGPT.

${BANNED_PROMISES.support}

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "founder-close", subject, html, text }
}

export function generateVaultMayaFounderFinalDayEmail(
  params: FounderCloseParams
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_final_day")
  const deadline = escapeHtml(params.founderDeadline)
  const subject = "The $19 Vault Maya price ends today"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph(`The Vault Maya founder price ends today, ${deadline}.`),
    paragraph(
      "If you join before then, you keep $19/month for as long as your membership stays active. After the deadline, new members will join at $29/month."
    ),
    renderStonePanel(
      `${paragraph("Every current Vault collection ready to create.", "margin-bottom:8px;")}${paragraph("30 photo creations each month.", "margin-bottom:8px;")}${paragraph("Your own gallery and a new photoshoot every Monday.", "margin-bottom:0;")}`,
      "YOUR MEMBERSHIP"
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Join Vault Maya · $19/month", ctaUrl)}</div>`,
    paragraph(
      "Your monthly photos refresh on your billing date, and unused monthly photos expire when they refresh. Any extra top-up credits you buy stay until you use them."
    ),
    paragraph(
      "If Vault Maya is not right for you, you do not need to do anything. The product stays open. Only the founder price changes."
    ),
    marketingFooter("You are receiving this because you asked to hear from SSELFIE."),
  ].join("")

  const html = renderStoneShell({
    title: "$19 ends today",
    eyebrow: "VAULT MAYA",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour balcony portrait from the SSELFIE Vault",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

The Vault Maya founder price ends today, ${params.founderDeadline}.

If you join before then, you keep $19/month for as long as your membership stays active. After the deadline, new members will join at $29/month.

Your membership includes every current Vault collection ready to create, 30 photo creations each month, your own gallery and a new photoshoot every Monday.

Join Vault Maya at $19/month: ${ctaUrl}

Your monthly photos refresh on your billing date, and unused monthly photos expire when they refresh. Any extra top-up credits you buy stay until you use them.

If Vault Maya is not right for you, you do not need to do anything. The product stays open. Only the founder price changes.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "founder-final-day", subject, html, text }
}

export function generateVaultMayaFounderFinalHoursEmail(
  params: FounderCloseParams
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya", "vault_maya_launch_final_hours")
  const deadline = escapeHtml(params.founderDeadline)
  const subject = "A final reminder before the Vault Maya price changes"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph(
      `Just a final reminder because you had a look at Vault Maya. The $19/month founder price ends ${deadline}.`
    ),
    paragraph(
      "If you join before then, you keep $19/month while your membership stays active. After that, the price for new members is $29/month."
    ),
    paragraph(renderPersonalLink("Join Vault Maya at the founder price", ctaUrl)),
    paragraph("If now is not the right time, that is completely okay."),
    marketingFooter("You are receiving this because you showed interest in Vault Maya."),
  ].join("")

  const html = renderPersonalNote({
    title: subject,
    bodyHtml,
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

Just a final reminder because you had a look at Vault Maya. The $19/month founder price ends ${params.founderDeadline}.

If you join before then, you keep $19/month while your membership stays active. After that, the price for new members is $29/month.

Join Vault Maya at the founder price: ${ctaUrl}

If now is not the right time, that is completely okay.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return { id: "founder-final-hours", subject, html, text }
}

export function generateVaultMayaFirstPhotoNudgeEmail(
  params: SharedParams = {}
): VaultMayaMarketingEmail {
  const ctaUrl = withTracking("/vault-maya/studio", "vault_maya_first_photo_nudge")
  const subject = "Your first Vault Maya photo is waiting"
  const bodyHtml = [
    paragraph(hello(params.firstName)),
    paragraph("You have everything you need to create your first Vault Maya photo."),
    paragraph(
      "Start with one clear selfie. If you want, add two or three angles so Maya can understand your features better. Then choose the photo you want to create."
    ),
    paragraph("That is it. You do not need to write anything."),
    `<div style="margin:26px 0 18px;">${renderStoneButton("Create my first photo", ctaUrl)}</div>`,
    paragraph(
      "If your first result does not feel right, try another clear selfie or reply to this email. I will help you."
    ),
  ].join("")

  const html = renderStoneShell({
    title: "Start with the photo you love",
    eyebrow: "YOUR FIRST PHOTO",
    bodyHtml,
    heroImageUrl: HERO_IMAGE,
    heroImageAlt: "Golden-hour editorial portrait ready to create inside Vault Maya",
  })

  const text = `Hey ${params.firstName?.trim() || "there"},

You have everything you need to create your first Vault Maya photo.

Start with one clear selfie. If you want, add two or three angles so Maya can understand your features better. Then choose the photo you want to create.

That is it. You do not need to write anything.

Create my first photo: ${ctaUrl}

If your first result does not feel right, try another clear selfie or reply to this email. I will help you.

Sandra x`

  return { id: "first-photo-nudge", subject, html, text }
}
