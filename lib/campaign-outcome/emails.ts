import {
  escapeHtml,
  renderPersonalLink,
  renderPersonalNote,
} from "@/lib/email/templates/stone-email"

type CampaignEmail = {
  subject: string
  html: string
  text: string
}

export function campaignIntakeEmail(input: {
  firstName: string
  intakeUrl: string
}): CampaignEmail {
  const name = escapeHtml(input.firstName || "there")
  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${name},</p>
    <p style="margin:0 0 18px;">Your campaign order is in.</p>
    <p style="margin:0 0 18px;">Add one clear selfie, what you sell, what you want to promote, and who it is for. Maya will use that to prepare the complete campaign.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("Add my campaign details", input.intakeUrl)}</p>
    <p style="margin:0;">Once your details are in, your campaign will be ready within 48 hours.</p>
  `
  return {
    subject: "One quick step for your SSELFIE campaign",
    html: renderPersonalNote({ title: "Your campaign order", bodyHtml }),
    text: [
      `Hi ${input.firstName || "there"},`,
      "",
      "Your campaign order is in.",
      "Add one clear selfie, what you sell, what you want to promote, and who it is for.",
      "",
      input.intakeUrl,
      "",
      "Once your details are in, your campaign will be ready within 48 hours.",
      "",
      "Sandra x",
    ].join("\n"),
  }
}

export function campaignDeliveryEmail(input: {
  firstName: string
  deliveryUrl: string
}): CampaignEmail {
  const name = escapeHtml(input.firstName || "there")
  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${name},</p>
    <p style="margin:0 0 18px;">Your campaign is ready.</p>
    <p style="margin:0 0 18px;">I checked your photos, your reel scripted and ready to assemble, the feed posts, carousel, Stories, and the five-day plan Maya prepared for you.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("Open my campaign", input.deliveryUrl)}</p>
    <p style="margin:0 0 18px;">Start with post one today. It is marked at the top of your page.</p>
    <p style="margin:0;">Everything is on one page so you can copy the words and save the visuals.</p>
  `
  return {
    subject: "Your SSELFIE campaign is ready",
    html: renderPersonalNote({ title: "Your campaign is ready", bodyHtml }),
    text: [
      `Hi ${input.firstName || "there"},`,
      "",
      "Your campaign is ready.",
      "I checked the complete campaign kit Maya prepared for you.",
      "",
      input.deliveryUrl,
      "",
      "Start with post one today. It is marked at the top of your page.",
      "",
      "Everything is on one page so you can copy the words and save the visuals.",
      "",
      "Sandra x",
    ].join("\n"),
  }
}

export function campaignDay7Email(input: {
  firstName: string
  yesUrl: string
  noUrl: string
  repeatUrl: string
}): CampaignEmail {
  const name = escapeHtml(input.firstName || "there")
  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${name},</p>
    <p style="margin:0 0 18px;">A quick question about the campaign Maya made for you.</p>
    <p style="margin:0 0 18px;">Did you publish any of it?</p>
    <p style="margin:0 0 18px;">No pressure either way, I just want to know if it helped.</p>
    <p style="margin:0 0 10px;">${renderPersonalLink("Yes, I posted", input.yesUrl)}</p>
    <p style="margin:0 0 22px;">${renderPersonalLink("Not yet", input.noUrl)}</p>
    <p style="margin:0 0 18px;">If you have something new to promote, ${renderPersonalLink("Maya can prepare the next campaign here", input.repeatUrl)}.</p>
  `
  return {
    subject: "Did you post your campaign?",
    html: renderPersonalNote({ title: "Did you post your campaign?", bodyHtml }),
    text: [
      `Hi ${input.firstName || "there"},`,
      "",
      "Did you publish any of the campaign Maya made for you?",
      "No pressure either way, I just want to know if it helped.",
      `Yes: ${input.yesUrl}`,
      `Not yet: ${input.noUrl}`,
      "",
      `Create your next campaign: ${input.repeatUrl}`,
      "",
      "Sandra x",
    ].join("\n"),
  }
}
