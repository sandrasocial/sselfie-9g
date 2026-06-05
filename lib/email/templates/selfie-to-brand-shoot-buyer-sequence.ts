import { buildRevenueEmailLink } from "./revenue-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

interface SelfieToBrandShootBuyerEmailParams {
  firstName: string
  accessUrl: string
}

function trackedCourseLink(accessUrl: string, emailType: string, content: string) {
  return buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_to_brand_shoot_activation",
    content,
    emailType,
  })
}

export function generateSelfieToBrandShootDay1SourceAndWorldEmail({
  firstName,
  accessUrl,
}: SelfieToBrandShootBuyerEmailParams): { html: string; text: string; subject: string } {
  const emailType = "selfie-to-brand-shoot-day1-source-and-world"
  const courseUrl = trackedCourseLink(accessUrl, emailType, "open_module_1")
  const subject = "start with one clear selfie"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your first job inside Selfie to Brand Shoot is very simple.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Choose one clear source selfie. Then choose the visual world you want your audience to start recognizing you for.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Do not start by making 30 random images.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Start with one photo, one visual direction, and one first shoot.</p>`,
      "Today"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the System", courseUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If your selfie is not perfect, that is okay. Clear beats pretty. You can make the image beautiful later.</p>
  `

  return {
    subject,
    html: renderStoneShell({
      title: "Start with one clear selfie.",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "Your first step is a clear source photo and one repeatable visual world.",
      bodyHtml,
      footerLead: "Reply if you get stuck choosing your source photo.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

Your first job inside Selfie to Brand Shoot is very simple.

Choose one clear source selfie. Then choose the visual world you want your audience to start recognizing you for.

Today:
- Do not start by making 30 random images.
- Start with one photo, one visual direction, and one first shoot.

Open the System:
${courseUrl}

If your selfie is not perfect, that is okay. Clear beats pretty. You can make the image beautiful later.

Reply if you get stuck choosing your source photo.

Sandra x`,
  }
}

export function generateSelfieToBrandShootDay3FirstShootEmail({
  firstName,
  accessUrl,
}: SelfieToBrandShootBuyerEmailParams): { html: string; text: string; subject: string } {
  const emailType = "selfie-to-brand-shoot-day3-first-shoot"
  const courseUrl = trackedCourseLink(accessUrl, emailType, "open_module_3")
  const subject = "make the first three images"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Today is the first visible win.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Use your source selfie and your Visual Consistency Code to create three images: one profile portrait, one reel cover, and one lifestyle brand image.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">If the first result is close, fix it. Do not abandon the whole visual world.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Adjust the face, light, pose, crop, or intensity before you switch direction.</p>`,
      "First shoot rule"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Create My First Shoot", courseUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">You are not trying to create the perfect gallery today. You are creating the first three anchors.</p>
  `

  return {
    subject,
    html: renderStoneShell({
      title: "Make the first three images.",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "Profile portrait. Reel cover. Lifestyle brand image.",
      bodyHtml,
      footerLead: "One first result is enough to learn from.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

Today is the first visible win.

Use your source selfie and your Visual Consistency Code to create three images: one profile portrait, one reel cover, and one lifestyle brand image.

First shoot rule:
If the first result is close, fix it. Do not abandon the whole visual world.
Adjust the face, light, pose, crop, or intensity before you switch direction.

Create My First Shoot:
${courseUrl}

You are not trying to create the perfect gallery today. You are creating the first three anchors.

Sandra x`,
  }
}

export function generateSelfieToBrandShootDay5SelectAndContentEmail({
  firstName,
  accessUrl,
}: SelfieToBrandShootBuyerEmailParams): { html: string; text: string; subject: string } {
  const emailType = "selfie-to-brand-shoot-day5-select-and-content"
  const courseUrl = trackedCourseLink(accessUrl, emailType, "open_modules_4_5")
  const subject = "do not keep every pretty image"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is the taste part.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Not every beautiful AI image belongs in your personal brand. Keep the images that still look like you, match your visual world, and have a real content use.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Choose 3-7 final images.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Give each image one job.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Then turn the shoot into your first week of content.</p>`,
      "Your action"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Pick My Best Images", courseUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Recognizable beats perfect. Useful beats more.</p>
  `

  return {
    subject,
    html: renderStoneShell({
      title: "Do not keep every pretty image.",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "Choose what still looks like you, then turn it into content.",
      bodyHtml,
      footerLead: "If you are unsure, use the Keep / Fix / Delete filter.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

This is the taste part.

Not every beautiful AI image belongs in your personal brand. Keep the images that still look like you, match your visual world, and have a real content use.

Your action:
- Choose 3-7 final images.
- Give each image one job.
- Then turn the shoot into your first week of content.

Pick My Best Images:
${courseUrl}

Recognizable beats perfect. Useful beats more.

Sandra x`,
  }
}

export function generateSelfieToBrandShootDay7ProofRequestEmail({
  firstName,
  accessUrl,
}: SelfieToBrandShootBuyerEmailParams): { html: string; text: string; subject: string } {
  const emailType = "selfie-to-brand-shoot-day7-proof-request"
  const courseUrl = trackedCourseLink(accessUrl, emailType, "open_system")
  const subject = "can I ask you something?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you have created even one image from the System, I would love to hear what changed for you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not have to share your face publicly. You can reply with words only, screenshots only, or nothing at all.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">What did you create?</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">What surprised you?</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">What will you use it for?</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">And if you are happy for me to share any part of it, please write: “yes, you can share this.”</p>`,
      "Reply with this"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the System", courseUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">No pressure. I ask because real results help me make this better for the next woman.</p>
  `

  return {
    subject,
    html: renderStoneShell({
      title: "Can I ask you something?",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "Your result can be private. Your feedback still matters.",
      bodyHtml,
      footerLead: "Only share what feels safe to share.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

If you have created even one image from the System, I would love to hear what changed for you.

You do not have to share your face publicly. You can reply with words only, screenshots only, or nothing at all.

Reply with this:
- What did you create?
- What surprised you?
- What will you use it for?
- And if you are happy for me to share any part of it, please write: "yes, you can share this."

Open the System:
${courseUrl}

No pressure. I ask because real results help me make this better for the next woman.

Only share what feels safe to share.

Sandra x`,
  }
}
