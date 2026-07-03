export const CRON_BUNDLE_IDS = [
  "payment_resolution",
  "generation_reconciliation",
  "subscription_credits_reconciliation",
  "lifecycle_email",
  "health_reporting",
] as const

export type CronBundleId = (typeof CRON_BUNDLE_IDS)[number]

export type CronRouteLifecycle = "scheduled" | "manual"

export type RouteClassification =
  | "live"
  | "redirect-only"
  | "internal/admin"
  | "disabled"
  | "delete-candidate"

export type CronRoutePath = `/api/cron/${string}`

export type CronBundle = {
  id: CronBundleId
  label: string
  owns: string
}

export type CronRouteOwnership = {
  path: CronRoutePath
  bundle: CronBundleId
  lifecycle: CronRouteLifecycle
  classification: RouteClassification
  purpose: string
}

export type RemovedCronRoute = {
  path: CronRoutePath
  replacement: CronRoutePath
  proof: string
}

export const CRON_BUNDLES: readonly CronBundle[] = [
  {
    id: "payment_resolution",
    label: "Payment resolution",
    owns: "Pending payment settlement and checkout reconciliation.",
  },
  {
    id: "generation_reconciliation",
    label: "Generation reconciliation",
    owns: "Maya generation status, generated files, and asset reconciliation.",
  },
  {
    id: "subscription_credits_reconciliation",
    label: "Subscription and credits reconciliation",
    owns: "Studio subscriptions, membership state, and credit balance repair.",
  },
  {
    id: "lifecycle_email",
    label: "Lifecycle email",
    owns: "Customer onboarding, nurture, win-back, referrals, newsletters, and audience segments.",
  },
  {
    id: "health_reporting",
    label: "Health and reporting",
    owns: "System health, funnel reporting, revenue reporting, Maya trend reports, and internal diagnostics.",
  },
] as const

export const CRON_ROUTE_OWNERSHIP: readonly CronRouteOwnership[] = [
  {
    path: "/api/cron/resolve-pending-payments",
    bundle: "payment_resolution",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Resolve Stripe checkout sessions that were not completed by webhook delivery.",
  },
  {
    path: "/api/cron/reconcile-generation-assets",
    bundle: "generation_reconciliation",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Repair generated asset rows and storage links.",
  },
  {
    path: "/api/cron/reconcile-generations",
    bundle: "generation_reconciliation",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Reconcile Maya generation records and statuses.",
  },
  {
    path: "/api/cron/reconcile-credits",
    bundle: "subscription_credits_reconciliation",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Repair customer credit balances.",
  },
  {
    path: "/api/cron/reconcile-subscriptions",
    bundle: "subscription_credits_reconciliation",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Repair customer subscription and membership state.",
  },
  {
    path: "/api/cron/nurture-sequence",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Send nurture emails for customer activation and conversion.",
  },
  {
    path: "/api/cron/onboarding-sequence",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Send Studio onboarding and activation lifecycle email.",
  },
  {
    path: "/api/cron/referral-bonus-notifications",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Notify customers about referral bonus activity.",
  },
  {
    path: "/api/cron/send-scheduled-newsletters",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Process scheduled newsletter sends.",
  },
  {
    path: "/api/cron/sync-audience-segments",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Sync audience segments to email tooling.",
  },
  {
    path: "/api/cron/refresh-segments",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Refresh internal audience segment membership.",
  },
  {
    path: "/api/cron/win-back-sequence",
    bundle: "lifecycle_email",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Send win-back lifecycle email.",
  },
  {
    path: "/api/cron/backfill-resend-audience",
    bundle: "lifecycle_email",
    lifecycle: "manual",
    classification: "internal/admin",
    purpose: "Manual Resend audience backfill. Not scheduled in vercel.json.",
  },
  {
    path: "/api/cron/admin-alerts",
    bundle: "health_reporting",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Send daily admin health alerts.",
  },
  {
    path: "/api/cron/cron-health-check",
    bundle: "health_reporting",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Record cron heartbeat health.",
  },
  {
    path: "/api/cron/maya-instagram-trends-weekly",
    bundle: "health_reporting",
    lifecycle: "scheduled",
    classification: "internal/admin",
    purpose: "Refresh weekly Instagram trend intelligence for Maya.",
  },
  {
    path: "/api/cron/product-qa-daily",
    bundle: "health_reporting",
    lifecycle: "manual",
    classification: "internal/admin",
    purpose: "Manual product QA report. Not scheduled in vercel.json.",
  },
  {
    path: "/api/cron/reindex-codebase",
    bundle: "health_reporting",
    lifecycle: "manual",
    classification: "internal/admin",
    purpose: "Manual codebase index refresh. Not scheduled in vercel.json.",
  },
] as const

export const REMOVED_CRON_ROUTES: readonly RemovedCronRoute[] = [
  {
    path: "/api/cron/funnel-report-daily",
    replacement: "/api/cron/daily-sandra-briefing",
    proof: "Deleted in admin cleanup 2026-06-11 (docs/audits/ADMIN_AUDIT_2026-06-11.md). Was unscheduled; reporting consolidated into daily Sandra briefing.",
  },
  {
    path: "/api/cron/revenue-engine-weekly",
    replacement: "/api/cron/daily-sandra-briefing",
    proof: "Deleted in admin cleanup 2026-06-11. Was unscheduled; scripts/revenue-engine-weekly-digest.ts remains for manual digests.",
  },
  {
    path: "/api/cron/arpu-churn-weekly",
    replacement: "/api/cron/daily-sandra-briefing",
    proof: "Deleted in admin cleanup 2026-06-11. Manual route, never scheduled in vercel.json.",
  },
  {
    path: "/api/cron/cohort-delivery-load-weekly",
    replacement: "/api/cron/daily-sandra-briefing",
    proof: "Deleted in admin cleanup 2026-06-11. Manual route, never scheduled in vercel.json.",
  },
  {
    path: "/api/cron/cohort-report-weekly",
    replacement: "/api/cron/daily-sandra-briefing",
    proof: "Deleted in admin cleanup 2026-06-11. Manual route; scripts/cohort-report-weekly.ts remains for manual digests.",
  },
  {
    path: "/api/cron/blueprint-email-sequence",
    replacement: "/api/cron/nurture-sequence",
    proof: "Disabled no-op route, absent from vercel.json, and no live app/admin caller references it.",
  },
  {
    path: "/api/cron/blueprint-followup-sequence",
    replacement: "/api/cron/nurture-sequence",
    proof:
      "Retired 2026-07-03 (Sandra-approved email audit). Route was never scheduled in vercel.json and email_logs show nothing sent since 2026-02-20. Templates archived in lib/email/templates/archived/. Blueprint buyers get delivery-only email until a replacement sequence is specced.",
  },
  {
    path: "/api/cron/welcome-back-sequence",
    replacement: "/api/cron/win-back-sequence",
    proof: "Disabled no-op route, absent from vercel.json, and no live app/admin caller references it.",
  },
  {
    path: "/api/cron/welcome-sequence",
    replacement: "/api/cron/onboarding-sequence",
    proof: "Disabled no-op route, absent from vercel.json, and no live app/admin caller references it.",
  },
] as const

export function getCronRouteOwnership(path: string): CronRouteOwnership | undefined {
  return CRON_ROUTE_OWNERSHIP.find((route) => route.path === path)
}

export function getScheduledCronPaths(): CronRoutePath[] {
  return CRON_ROUTE_OWNERSHIP.filter((route) => route.lifecycle === "scheduled").map((route) => route.path)
}

export function getManualCronPaths(): CronRoutePath[] {
  return CRON_ROUTE_OWNERSHIP.filter((route) => route.lifecycle === "manual").map((route) => route.path)
}
