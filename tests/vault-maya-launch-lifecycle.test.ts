import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("Vault Maya launch lifecycle wiring", () => {
  it("marks a Vault Maya checkout starter as high intent without blocking checkout", () => {
    const checkout = source("app/actions/landing-checkout.ts")
    expect(checkout).toContain('product.type === "vault_maya" && normalizedCustomerEmail')
    expect(checkout).toContain("addVaultMayaLaunchHighIntent")
    expect(checkout).toContain("Vault Maya launch intent sync failed")
  })

  it("suppresses a paid buyer from every later sales segment", () => {
    const fulfillment = source("lib/payments/handlers/studio-membership.ts")
    expect(fulfillment).toContain(
      'productType === "vault_maya" ? "vault_maya" : "sselfie_studio_membership"'
    )
    expect(fulfillment).toContain("if (isPaymentPaid && customerEmail)")
    expect(fulfillment).toContain("removeVaultMayaLaunchSalesContact")
  })

  it("uses real launch clicks for the high-intent final reminder", () => {
    const webhook = source("app/api/webhooks/resend/route.ts")
    expect(webhook).toContain('context.eventType === "email.clicked"')
    expect(webhook).toContain("isVaultMayaLaunchCampaignKey(context.resolvedEmailType)")
    expect(webhook).toContain("addVaultMayaLaunchHighIntent(context.recipientEmail)")
  })

  it("nudges only recent paid Vault members who have not completed a photo", () => {
    const cron = source("app/api/cron/suite-habit-emails/route.ts")
    expect(cron).toContain('envFlag("VAULT_MAYA_LIFECYCLE_EMAILS_ENABLED")')
    expect(cron).toContain("s.product_type = 'vault_maya'")
    expect(cron).toContain("s.created_at <= NOW() - INTERVAL '24 hours'")
    expect(cron).toContain("event_name = 'vault_maya_generation_completed'")
    expect(cron).toContain("VAULT_MAYA_FIRST_PHOTO_NUDGE_EMAIL_TYPE")
  })

  it("treats a whitespace-padded dry-run flag as enabled", () => {
    const config = source("lib/email/config.ts")
    const sender = source("lib/email/send-email.ts")
    const launch = source("scripts/prepare-vault-maya-launch.ts")
    expect(config).toContain('trim().toLowerCase() === "true"')
    expect(sender).toContain('trim().toLowerCase() === "true"')
    expect(launch).toContain('trim().toLowerCase() === "true"')
  })

  it("runs follow-ups hourly and suppresses current buyers immediately before sending", () => {
    const vercel = source("vercel.json")
    const route = source("app/api/cron/vault-maya-launch/route.ts")
    const runner = source("lib/email/campaigns/vault-maya-launch-runner.ts")

    expect(vercel).toContain('"path": "/api/cron/vault-maya-launch"')
    expect(vercel).toContain('"schedule": "0 * * * *"')
    expect(route).toContain('envFlag("VAULT_MAYA_LAUNCH_ENABLED")')
    expect(runner).toContain("suppressCurrentSalesExclusions()")
    expect(runner).toContain("removeVaultMayaLaunchSalesContact(email)")
    expect(runner).toContain("VAULT_MAYA_LAUNCH_PROOF.imageUrl")
    expect(runner).toContain('dueAt: "2026-08-11T06:00:00.000Z"')
    expect(runner).toContain('expiresAt: "2026-08-11T08:00:00.000Z"')
  })
})
