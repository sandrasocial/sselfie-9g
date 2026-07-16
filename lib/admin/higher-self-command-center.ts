import {
  SSELFIE_COMPANY_KERNEL_PATH,
  SSELFIE_REVENUE_PORTFOLIO,
} from "@/lib/business/company-kernel"

export type HigherSelfCommandLink = {
  label: string
  href: string
}

export type HigherSelfCommandMove = {
  id: string
  title: string
  action: string
  reason: string
  source: string
  link: HigherSelfCommandLink
}

export type HigherSelfStoryMove = {
  anchor: string
  title: string
  opener: string
  frames: string[]
  bridge: string
  source: string
}

export type HigherSelfCommandCenter = {
  categoryLock: string
  coreLock: string
  headline: string
  truth: string
  moneyMove: HigherSelfCommandMove
  storyMove: HigherSelfStoryMove
  offerBridge: HigherSelfCommandMove
  followUpMove: HigherSelfCommandMove
  systemMove: HigherSelfCommandMove
  ceoRule: string
}

export type HigherSelfCommandCenterInput = {
  money: {
    last48h: { payments: number; revenue: number }
    week: { payments: number; revenue: number }
    month: { payments: number; revenue: number }
  }
  needsMe: {
    webhookReviews: number
    newSupportThreads: number
  }
  content: {
    nextPostTitle: string | null
    nextPostHook: string | null
    topPrompt: { title: string; copies: number } | null
  }
  scorecard: {
    workWithMe: {
      applications30d: number
      qualifiedOpen: number
      bookedCalls: number
      paymentLinksSent: number
      won: number
    }
    funnels30d: Array<{
      productType: string
      starts: number
      recoverableStarts: number
      purchases: number
      revenue: number
    }>
    trials: {
      claimed30d: number
      firstGeneration30d: number
      active: number
    }
  } | null
}

const CATEGORY_LOCK =
  "I help women stop hiding, become recognizable, know what to say, and build something of their own from their phone, their story, and AI."

const CORE_LOCK =
  "This was never just about selfies. It was about becoming visible enough to build something of your own."

function moneyQuiet(input: HigherSelfCommandCenterInput) {
  return input.money.last48h.payments === 0
}

function warmPipelineCount(input: HigherSelfCommandCenterInput) {
  const work = input.scorecard?.workWithMe
  if (!work) return 0
  return work.qualifiedOpen + work.bookedCalls + work.paymentLinksSent
}

function topLeakingFunnel(input: HigherSelfCommandCenterInput) {
  return (
    input.scorecard?.funnels30d
      .filter((row) => row.starts >= 5 && row.purchases === 0)
      .sort((a, b) => b.starts - a.starts)[0] || null
  )
}

function trialActivationGap(input: HigherSelfCommandCenterInput) {
  const trials = input.scorecard?.trials
  if (!trials || trials.claimed30d < 3) return false
  return trials.firstGeneration30d < Math.ceil(trials.claimed30d * 0.5)
}

function buildMoneyMove(input: HigherSelfCommandCenterInput): HigherSelfCommandMove {
  if (input.needsMe.webhookReviews > 0) {
    return {
      id: "protect-payment-truth",
      title: "Protect the money first",
      action: "Review unresolved payment/webhook events before creating anything else.",
      reason: "If Stripe or fulfillment has a review queue, financial truth comes before content.",
      source: "webhook_events_needs_review",
      link: { label: "Open payment reviews", href: "/admin/webhook-review" },
    }
  }

  const warmCount = warmPipelineCount(input)
  if (warmCount > 0) {
    return {
      id: "legacy-attended-follow-up",
      title: "Protect existing attended inquiries",
      action: `Follow up the ${warmCount} existing attended inquir${warmCount === 1 ? "y" : "ies"} already in the pipeline. Do not turn this legacy path back into the public growth engine.`,
      reason: "Existing relationships deserve a complete answer even when the company changes its acquisition model.",
      source: "brand_engine_applications",
      link: { label: "Open attended pipeline", href: "/admin/work-with-me" },
    }
  }

  if (moneyQuiet(input)) {
    return {
      id: "move-private-revenue-pipeline",
      title: "Move the private revenue pipeline",
      action: `Move the active ${SSELFIE_REVENUE_PORTFOLIO.media.currentOffer} and ${SSELFIE_REVENUE_PORTFOLIO.ip.currentOffer} pipeline: follow up approved buyers, prepare the next buyer-specific proposals, and record replies. Do not turn public content into a brand pitch.`,
      reason: "With 0 payments in the last 48 hours, the fastest credible cash path is the approved private media and IP pipeline—not another low-ticket build.",
      source: `stripe_payments + ${SSELFIE_COMPANY_KERNEL_PATH}`,
      link: { label: "Stay in the command center", href: "/admin" },
    }
  }

  const leaking = topLeakingFunnel(input)
  if (leaking) {
    return {
      id: "repair-leaking-funnel",
      title: `Repair the ${leaking.productType} bridge`,
      action: `${leaking.starts} checkout starts and 0 purchases means the bridge needs one clear fix today.`,
      reason: "Attention without purchase means the message or next step is not clear enough at the buying moment.",
      source: "checkout_attribution",
      link: { label: "Open funnel monitor", href: "/admin/prompt-vault" },
    }
  }

  return {
    id: "visible-offer-bridge",
    title: "Keep the public bridge clear",
    action: "Connect today's public content only to the useful commerce-base or SUITE next step. Keep media, institutional, and founding-partner sales in private buyer channels.",
    reason: "One public next step protects audience trust while distinct private buyers receive distinct offers.",
    source: SSELFIE_COMPANY_KERNEL_PATH,
    link: { label: "Open content", href: "/admin/content-brief" },
  }
}

function buildStoryMove(input: HigherSelfCommandCenterInput): HigherSelfStoryMove {
  const promptSignal = input.content.topPrompt
    ? `The strongest prompt signal is ${input.content.topPrompt.title} with ${input.content.topPrompt.copies} copies.`
    : "No prompt-copy signal is available yet."

  const anchor = moneyQuiet(input)
    ? "My first online income changed how I saw myself"
    : input.content.nextPostTitle || "This was never just about selfies"

  return {
    anchor,
    title: "This was never just about selfies",
    opener: "I was thinking about something today. This was never really about selfies.",
    frames: [
      "The selfie was just the first thing I could do.",
      "It helped me stop hiding long enough to become visible.",
      "The photo gets attention. The story builds connection. The message builds trust. The offer creates income.",
      "That is what I help women build now: a visible life and business from their phone, their story, and AI.",
    ],
    bridge: "If you want to try this with your own selfie, reply PROMPT and I will send you the starting point.",
    source: `${promptSignal} Story anchor source: purpose lock + Story Bank + Company Kernel.`,
  }
}

function buildOfferBridge(input: HigherSelfCommandCenterInput): HigherSelfCommandMove {
  return {
    id: "private-offer-boundary",
    title: "Keep private offers private",
    action: moneyQuiet(input)
      ? "Public content stays useful and recognizable today. Move Tutorial Partnerships and AI Visibility Lab through researched, approved buyer conversations."
      : "Use one relevant public commerce or SUITE bridge. Do not auto-pitch partnerships, licenses, or Visibility Partner to followers.",
    reason: "The public audience and private institutional buyers have different jobs, proof needs, and buying moments.",
    source: SSELFIE_COMPANY_KERNEL_PATH,
    link: { label: "Open content", href: "/admin/content-brief" },
  }
}

function buildFollowUpMove(input: HigherSelfCommandCenterInput): HigherSelfCommandMove {
  if (input.needsMe.newSupportThreads > 0) {
    return {
      id: "clear-support",
      title: "Protect trust",
      action: `Clear ${input.needsMe.newSupportThreads} new support thread${input.needsMe.newSupportThreads === 1 ? "" : "s"} before shipping new promises.`,
      reason: "Retention and trust are part of the money system.",
      source: "feedback",
      link: { label: "Open support", href: "/admin/customer-support" },
    }
  }

  return {
    id: "move-approved-buyer-follow-ups",
    title: "Complete approved buyer follow-ups",
    action: "Answer every active partnership or institutional reply and prepare the next approved follow-up. Do not manufacture ten generic conversations for activity's sake.",
    reason: "Cash moves when a relevant buyer receives a complete, buyer-specific next step.",
    source: SSELFIE_COMPANY_KERNEL_PATH,
    link: { label: "Open admin home", href: "/admin" },
  }
}

function buildSystemMove(input: HigherSelfCommandCenterInput): HigherSelfCommandMove {
  if (!input.content.nextPostHook) {
    return {
      id: "generate-weekly-brief",
      title: "Restore the content compass",
      action: "Generate the weekly brief so today has a data-backed content direction.",
      reason: "The system needs one current brief before it can make clean daily decisions.",
      source: "content_brief_weekly",
      link: { label: "Open content", href: "/admin/content-brief" },
    }
  }

  if (trialActivationGap(input)) {
    return {
      id: "suite-activation-gap",
      title: "Close the SUITE activation gap",
      action: "Find the fastest way to get trial members to their first Maya output.",
      reason: "SUITE is the monthly creation system. Members need an early win before they become retained MRR.",
      source: "subscriptions + analytics_events",
      link: { label: "Open admin home", href: "/admin" },
    }
  }

  const leaking = topLeakingFunnel(input)
  if (leaking) {
    return {
      id: "tighten-buying-moment",
      title: "Tighten one buying moment",
      action: `Look at the ${leaking.productType} path and make the next step clearer.`,
      reason: "One focused conversion repair beats five new ideas.",
      source: "checkout_attribution",
      link: { label: "Open funnel monitor", href: "/admin/prompt-vault" },
    }
  }

  return {
    id: "record-story-signal",
    title: "Record what created replies",
    action: "After posting, note which frame created replies so tomorrow's story is sharper.",
    reason: "The system learns when Sandra captures the exact story that moved people.",
    source: "manual Sandra signal",
    link: { label: "Open content", href: "/admin/content-brief" },
  }
}

export function buildHigherSelfCommandCenter(
  input: HigherSelfCommandCenterInput
): HigherSelfCommandCenter {
  const quiet = moneyQuiet(input)

  return {
    categoryLock: CATEGORY_LOCK,
    coreLock: CORE_LOCK,
    headline: quiet
      ? "Today is a private-revenue and customer-trust day."
      : "Today is a focused money-and-message day.",
    truth: quiet
      ? "When sales are quiet, move the approved private media and IP pipeline while public content keeps building expertise and trust."
      : "Keep each revenue engine pointed at its own buyer: money truth, private pipeline, public expertise, and customer retention.",
    moneyMove: buildMoneyMove(input),
    storyMove: buildStoryMove(input),
    offerBridge: buildOfferBridge(input),
    followUpMove: buildFollowUpMove(input),
    systemMove: buildSystemMove(input),
    ceoRule:
      "Do the money move before opening a new build thread. One story, one offer bridge, one follow-up loop, one system improvement.",
  }
}
