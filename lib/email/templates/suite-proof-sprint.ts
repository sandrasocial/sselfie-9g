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

function proofBlock(proof?: SuiteProofAsset): string {
  if (!isSuiteProofApproved(proof)) {
    return renderStonePanel(
      "SANDRA: add one approved before-and-after proof image and one real sentence about how you used the finished photos. This email is blocked from approval until both are here."
    )
  }

  return [
    `<img src="${escapeHtml(proof!.imageUrl!)}" alt="${escapeHtml(proof!.imageAlt!)}" style="display:block;width:100%;height:auto;margin:8px 0 18px;border:0;" />`,
    paragraph(escapeHtml(proof!.useContext!)),
  ].join("")
}

export function generateSuiteProofSprintEmail(params: {
  firstName?: string
  proof?: SuiteProofAsset
} = {}): SuiteProofSprintEmail {
  const firstName = params.firstName?.trim() || "there"
  const checkoutUrl = getSuiteProofSprintCheckoutUrl()
  const proofReady = isSuiteProofApproved(params.proof)
  const subject = "I think I have been selling the wrong part"

  const bodyHtml = [
    paragraph(`Hey ${escapeHtml(firstName)},`),
    paragraph("I have to be honest."),
    paragraph(
      "I have spent months trying to fix this funnel with AI. At first the emails sounded like me. Then they slowly became colder, smoother and more generic."
    ),
    paragraph("And then I realised I had made the same mistake when I talked about SSELFIE."),
    paragraph("I kept explaining prompts, collections and tools."),
    paragraph(
      "But the useful part is taking one normal selfie and one messy idea, creating something that still feels like you, and knowing what to do next with it."
    ),
    proofBlock(params.proof),
    paragraph(
      "That is what I want SSELFIE SUITE to help you do. Not give you more AI to manage. Help you turn what you already have into something useful and keep moving."
    ),
    paragraph(
      "I am sharing this first with women who have already bought something from SSELFIE because I want to prove the result before I talk about it more widely."
    ),
    paragraph(
      `The annual SUITE is €${SUITE_PROOF_SPRINT.annualPriceEur} for the year. It is for the woman who is tired of starting from an empty screen every week and wants one place to create her photos, find the words and plan what comes next.`
    ),
    `<div style="margin:26px 0 18px;">${renderStoneButton("See the annual SSELFIE SUITE", checkoutUrl)}</div>`,
    paragraph("There is no deadline on this. I would rather you join because you can see how it could help you."),
    `<p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #D8D9DA;color:#818283;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;">You are receiving this because you previously bought a SSELFIE product.<br /><a href="${RESEND_UNSUBSCRIBE_URL}" style="color:#4F5052;text-decoration:underline;">Unsubscribe</a></p>`,
  ].join("")

  const proofText = proofReady
    ? `${params.proof!.useContext!.trim()}\n\n`
    : "[SANDRA: add the approved before-and-after proof and one real use sentence before this can be sent.]\n\n"
  const text = `Hey ${firstName},

I have to be honest.

I have spent months trying to fix this funnel with AI. At first the emails sounded like me. Then they slowly became colder, smoother and more generic.

And then I realised I had made the same mistake when I talked about SSELFIE.

I kept explaining prompts, collections and tools.

But the useful part is taking one normal selfie and one messy idea, creating something that still feels like you, and knowing what to do next with it.

${proofText}That is what I want SSELFIE SUITE to help you do. Not give you more AI to manage. Help you turn what you already have into something useful and keep moving.

I am sharing this first with women who have already bought something from SSELFIE because I want to prove the result before I talk about it more widely.

The annual SUITE is €${SUITE_PROOF_SPRINT.annualPriceEur} for the year. It is for the woman who is tired of starting from an empty screen every week and wants one place to create her photos, find the words and plan what comes next.

See the annual SSELFIE SUITE: ${checkoutUrl}

There is no deadline on this. I would rather you join because you can see how it could help you.

Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}

Sandra x`

  return {
    id: "suite-proof-sprint",
    status: proofReady ? "ready-for-approval" : "needs-proof",
    subject,
    html: renderStoneShell({
      eyebrow: "A REAL LOOK BEHIND SSELFIE",
      title: "I kept fixing the words. The real problem was underneath.",
      bodyHtml,
    }),
    text,
  }
}
