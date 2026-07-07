import { describe, expect, it, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import { buildAppV3ReturnTo, resolveAppV3InitialSection } from "@/lib/app-v3/navigation"
import { generateCreditRenewalEmail } from "@/lib/email/templates/credit-renewal"
import { generateDormantMemberReengagementEmail } from "@/lib/email/templates/dormant-member-reengagement"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"

const ROOT = process.cwd()

describe("APP-CUTOVER-01 readiness", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    process.env.NEXT_PUBLIC_APP_URL = "https://sselfie.ai"
  })

  it("routes member lifecycle and billing emails into /app, not legacy /studio", () => {
    const emails = [
      generateWelcomeEmail({
        customerName: "Sandra",
        customerEmail: "sandra@example.com",
        creditsGranted: 200,
        packageName: "STUDIO MEMBERSHIP",
        productType: "sselfie_studio_membership",
      }),
      generateWelcomeEmail({
        customerName: "Sandra",
        customerEmail: "sandra@example.com",
        creditsGranted: 50,
        packageName: "CREDIT PURCHASE",
        productType: "credit_topup",
      }),
      generateCreditRenewalEmail({ firstName: "Sandra", creditsGranted: 200 }),
      generateDormantMemberReengagementEmail({ firstName: "Sandra", creditBalance: 42 }),
      // monthly-usage-recap and payment-recovery templates were retired to
      // lib/email/templates/archived/ on 2026-07-03 (zero live senders).
    ]

    const combined = emails.map((email) => `${email.html}\n${email.text}`).join("\n\n")

    expect(combined).toContain("https://sselfie.ai/app")
    // The /app?view=account deep link lived in the retired payment-recovery template
    // (archived 2026-07-03); the deep-link resolver test below still covers the route.
    expect(combined).not.toContain("https://sselfie.ai/studio?tab=maya")
    expect(combined).not.toContain("https://sselfie.ai/studio?tab=account")
    expect(combined).not.toContain("https://sselfie.ai/studio\n")
  })

  it("opens supported /app deep-link sections and falls back to Create", () => {
    expect(resolveAppV3InitialSection("account")).toBe("account")
    expect(resolveAppV3InitialSection("photos")).toBe("photos")
    expect(resolveAppV3InitialSection("library")).toBe("library")
    expect(resolveAppV3InitialSection("content")).toBe("content")
    expect(resolveAppV3InitialSection("maya")).toBe("create")
    expect(resolveAppV3InitialSection(undefined)).toBe("create")
    expect(buildAppV3ReturnTo("create")).toBe("/app")
    expect(buildAppV3ReturnTo("account")).toBe("/app?view=account")
  })

  it("forwards normal legacy /studio visits into app v3 while the cutover flag is enabled", () => {
    const studioPage = fs.readFileSync(path.join(ROOT, "app/studio/page.tsx"), "utf8")

    expect(studioPage).toContain('params.legacy !== "1"')
    expect(studioPage).toContain('process.env.APP_V3_MEMBERS_ENABLED === "true"')
    expect(studioPage).toContain('["member", "trial", "limited", "none"].includes(access.level)')
    expect(studioPage).toContain('redirect("/app")')
  })
})
