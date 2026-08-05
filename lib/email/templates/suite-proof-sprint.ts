/* eslint-disable no-restricted-syntax -- Email clients require inline absolute colors. */
import {
  escapeHtml,
  renderStoneButton,
  renderStonePanel,
  renderStoneShell,
} from "./stone-email"
import {
  getSuiteProofSprintCheckoutUrl,
  isSuiteProofApproved,
  SUITE_PROOF_SPRINT,
  type SuiteProofAsset,
} from "../campaigns/suite-proof-sprint-plan"

const RESEND_UNSUBSCRIBE_URL = "{{{RESEND_UNSUBSCRIBE_URL}}}"

export type SuiteProofSprintEmail = {
  id: "suite-proof-sprint"
  status: "needs-proof" | "ready-for-approval"
  subject: string
  html: string
  text: string
}

function paragraph(copy: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.8;">${copy}</p>`
}

function proofImage(imageUrl: string, imageAlt: string, width = "100%"): string {
  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" width="${width}" style="display:block;width:${width};max-width:100%;height:auto;border:0;" />`
}

function proofBlock(proof?: SuiteProofAsset): string {
  if (!isSuiteProofApproved(proof)) {
    return renderStonePanel(
      "SANDRA: add one approved source selfie, three photos made from it and one real sentence about how you used them. This email is blocked from approval until all three parts are here."
    )
  }

  const source = proof!.sourceImage!
  const results = proof!.resultImages!.slice(0, 3)
  const carouselCover = proof!.carouselImages?.[0]

  return [
    '<p style="margin:24px 0 10px;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.8px;line-height:1.4;text-align:center;">THE ONE SELFIE I STARTED WITH</p>',
    `<div style="margin:0 auto 22px;max-width:280px;">${proofImage(source.imageUrl, source.imageAlt)}</div>`,
    '<p style="margin:0 0 10px;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.8px;line-height:1.4;text-align:center;">THREE PHOTOS I MADE FROM IT</p>',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="4" style="margin:0 0 20px;border-collapse:separate;"><tr>${results.map(image => `<td width="33.33%" valign="top">${proofImage(image.imageUrl, image.imageAlt)}</td>`).join("")}</tr></table>`,
    paragraph(escapeHtml(proof!.useContext!)),
    carouselCover
      ? [
          '<p style="margin:26px 0 10px;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.8px;line-height:1.4;text-align:center;">THE THOUGHT BECAME A CAROUSEL</p>',
          `<div style="margin:0 auto 24px;max-width:420px;">${proofImage(carouselCover.imageUrl, carouselCover.imageAlt)}</div>`,
        ].join("")
      : "",
  ].join("")
}

export function generateSuiteProofSprintEmail(params: {
  firstName?: string
  proof?: SuiteProofAsset
} = {}): SuiteProofSprintEmail {
  const firstName = params.firstName?.trim() || "there"
  const checkoutUrl = getSuiteProofSprintCheckoutUrl()
  const proofReady = isSuiteProofApproved(params.proof)
  const subject = "I'm 40. Why am I trying to create content like I'm 20?"
  const tutorialUrl = params.proof?.tutorialUrl?.trim()

  const bodyHtml = [
    paragraph(`Hey ${escapeHtml(firstName)},`),
    paragraph("I turned 40 this year."),
    paragraph(
      "And I have been thinking about why I keep trying to create content like I am 20."
    ),
    paragraph(
      "Some videos move so fast I can barely understand what is happening. The text is flashing. The camera changes every second. And by the end, I need to lie down in a dark room."
    ),
    paragraph("Honestly, they should come with a dizziness warning."),
    paragraph(
      "I was travelling to Marbella and I wanted to keep showing up. I wanted to share my story, my style and what I am building. But I did not want to do my hair and makeup, film twelve clips, edit everything and still feel behind."
    ),
    paragraph(
      "So I started with one normal selfie from my phone. I used that exact photo to create the images below."
    ),
    proofBlock(params.proof),
    paragraph(
      "This is what I mean when I say one photo can be enough. Not because every post should be an AI photo. Because one useful starting point can give you something to post, something to say and a reason to keep going."
    ),
    paragraph(
      "I do not want to become better at copying women twenty years younger than me. I want to become more consistent at sharing what only I can say. Maybe you feel the same."
    ),
    paragraph(
      "That is genuinely why I built SSELFIE SUITE. Not to give you more random AI tools. To help you start with what you already have, create something that feels like you, turn it into something useful and know what to do next."
    ),
    paragraph(
      `The annual SUITE is €${SUITE_PROOF_SPRINT.annualPriceEur} for the year. It is for the woman who is tired of starting from an empty screen every week and wants one place to create her photos, find the words and plan what comes next.`
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("See the annual SSELFIE SUITE", checkoutUrl)}</div>`,
    paragraph("There is no deadline on this. I would rather you join because you can see how it could help you."),
    tutorialUrl
      ? paragraph(
          `P.S. If you want to try the starting selfie first, <a href="${escapeHtml(tutorialUrl)}" style="color:#1F2021;text-decoration:underline;">this is the exact Instagram tutorial I used for photo one</a>.`
        )
      : "",
    `<p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #D8D9DA;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;">You are receiving this because you previously bought a SSELFIE product.<br /><a href="${RESEND_UNSUBSCRIBE_URL}" style="color:#4F5052;text-decoration:underline;">Unsubscribe</a></p>`,
  ].join("")

  const proofText = proofReady
    ? `[ONE SOURCE SELFIE AND THREE PHOTOS CREATED FROM IT]\n\n${params.proof!.useContext!.trim()}\n\n[CAROUSEL: I'M 40. WHY AM I TRYING TO CREATE CONTENT LIKE I'M 20?]\n\n`
    : "[SANDRA: add one approved source selfie, three photos made from it and one real use sentence before this can be approved.]\n\n"
  const tutorialText = tutorialUrl
    ? `\nP.S. If you want to try the starting selfie first, this is the exact Instagram tutorial I used for photo one: ${tutorialUrl}\n`
    : ""
  const text = `Hey ${firstName},

I turned 40 this year.

And I have been thinking about why I keep trying to create content like I am 20.

Some videos move so fast I can barely understand what is happening. The text is flashing. The camera changes every second. And by the end, I need to lie down in a dark room.

Honestly, they should come with a dizziness warning.

I was travelling to Marbella and I wanted to keep showing up. I wanted to share my story, my style and what I am building. But I did not want to do my hair and makeup, film twelve clips, edit everything and still feel behind.

So I started with one normal selfie from my phone. I used that exact photo to create the images below.

${proofText}This is what I mean when I say one photo can be enough. Not because every post should be an AI photo. Because one useful starting point can give you something to post, something to say and a reason to keep going.

I do not want to become better at copying women twenty years younger than me. I want to become more consistent at sharing what only I can say. Maybe you feel the same.

That is genuinely why I built SSELFIE SUITE. Not to give you more random AI tools. To help you start with what you already have, create something that feels like you, turn it into something useful and know what to do next.

The annual SUITE is €${SUITE_PROOF_SPRINT.annualPriceEur} for the year. It is for the woman who is tired of starting from an empty screen every week and wants one place to create her photos, find the words and plan what comes next.

See the annual SSELFIE SUITE: ${checkoutUrl}

There is no deadline on this. I would rather you join because you can see how it could help you.
${tutorialText}

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return {
    id: "suite-proof-sprint",
    status: proofReady ? "ready-for-approval" : "needs-proof",
    subject,
    html: renderStoneShell({
      eyebrow: "A REAL LOOK BEHIND SSELFIE",
      title: "I'm 40. Why am I trying to create content like I'm 20?",
      bodyHtml,
    }),
    text,
  }
}
