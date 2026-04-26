export type FunnelCleanupCandidate = {
  route: string
  status: "support" | "archive_candidate"
  decision: "keep" | "support" | "redirect" | "archive_later" | "delete_candidate" | "defer"
  dependencyRisk: "low" | "medium" | "high"
  strategicFit: "primary" | "support" | "weak"
  offerSlugs?: string[]
  reason: string
  likelyRedirect: string
  requiredBeforeAction: string[]
}

export const FUNNEL_CLEANUP_CANDIDATES: FunnelCleanupCandidate[] = [
  {
    route: "/checkout-upgrade",
    status: "archive_candidate",
    decision: "redirect",
    dependencyRisk: "low",
    strategicFit: "weak",
    reason: "Duplicate upgrade surface that already redirects to the private offer.",
    likelyRedirect: "/private-shoot",
    requiredBeforeAction: [
      "Confirm no active email or ManyChat links still point to /checkout-upgrade.",
      "Verify checkout failure/success pages do not depend on this route.",
    ],
  },
  {
    route: "/prompt-guides",
    status: "archive_candidate",
    decision: "redirect",
    dependencyRisk: "medium",
    strategicFit: "support",
    reason: "Prompt education may be useful, but it is not part of the current Guide -> Starter Kit -> Strategy -> Studio path.",
    likelyRedirect: "/why-studio",
    requiredBeforeAction: [
      "Check analytics traffic and backlinks.",
      "Confirm whether any prompt guides should become Studio/Maya education before hiding.",
    ],
  },
  {
    route: "/ai-tools-personal-branding",
    status: "archive_candidate",
    decision: "redirect",
    dependencyRisk: "low",
    strategicFit: "weak",
    reason: "SEO/tool page can distract from the simplified public funnel if it is not producing qualified traffic.",
    likelyRedirect: "/selfie-guide",
    requiredBeforeAction: [
      "Review organic traffic and conversion value.",
      "Keep only if it supports Selfie Guide or Studio acquisition.",
    ],
  },
  {
    route: "/sselfie-vs-aragon",
    status: "archive_candidate",
    decision: "redirect",
    dependencyRisk: "low",
    strategicFit: "weak",
    reason: "Comparison page supports old AI-photo positioning more than the new implementation funnel.",
    likelyRedirect: "/why-studio",
    requiredBeforeAction: [
      "Review search traffic and revenue attribution.",
      "Confirm comparison messaging does not conflict with the new Studio promise.",
    ],
  },
  {
    route: "/paid-blueprint",
    status: "support",
    decision: "support",
    dependencyRisk: "high",
    strategicFit: "support",
    offerSlugs: ["paid-blueprint", "paid_blueprint"],
    reason: "Paid Blueprint is the commercial Feed Planner entitlement and supports Studio/Masterclass implementation, but should not be a primary public CTA.",
    likelyRedirect: "/feed-planner",
    requiredBeforeAction: [
      "Review paid blueprint revenue and active delivery emails.",
      "Decide whether Blueprint becomes Starter Kit content, Masterclass workbook, or a support offer.",
    ],
  },
  {
    route: "/blueprint",
    status: "support",
    decision: "support",
    dependencyRisk: "high",
    strategicFit: "support",
    offerSlugs: ["paid-blueprint", "paid_blueprint"],
    reason: "Blueprint should be treated as the Feed Planner / 30-day Content Planner resource that supports Studio and Masterclass, not as a main public funnel entry.",
    likelyRedirect: "/feed-planner",
    requiredBeforeAction: [
      "Check active subscribers and feed planner dependencies.",
      "Preserve Feed Planner access before changing public route behavior.",
    ],
  },
  {
    route: "/ai-brand-photos",
    status: "support",
    decision: "keep",
    dependencyRisk: "medium",
    strategicFit: "support",
    reason: "AI photo acquisition can support Studio, but should not compete with Selfie Guide as the main first step.",
    likelyRedirect: "/selfie-guide",
    requiredBeforeAction: [
      "Review organic traffic and Studio conversion.",
      "Update CTA hierarchy before any redirect.",
    ],
  },
  {
    route: "/why-studio",
    status: "support",
    decision: "keep",
    dependencyRisk: "medium",
    strategicFit: "support",
    reason: "Useful explanation page for Studio, but secondary to the simpler entry funnel.",
    likelyRedirect: "/join/studio",
    requiredBeforeAction: [
      "Keep while it explains Studio clearly.",
      "Review whether CTAs align with Guide -> Starter Kit -> Studio.",
    ],
  },
]

export function getFunnelCleanupCandidate(route: string) {
  return FUNNEL_CLEANUP_CANDIDATES.find((candidate) => candidate.route === route) || null
}
