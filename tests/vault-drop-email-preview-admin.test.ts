import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Vault drop email admin preview", () => {
  it("renders both audience previews and only sends admin test emails from the admin route", () => {
    const root = process.cwd()
    const route = fs.readFileSync(path.join(root, "app/api/admin/vault-drop-email/route.ts"), "utf8")
    const component = fs.readFileSync(path.join(root, "components/admin/vault-drop-email-preview.tsx"), "utf8")
    const adminPage = fs.readFileSync(path.join(root, "app/admin/content-brief/page.tsx"), "utf8")
    const sendEmail = fs.readFileSync(path.join(root, "lib/email/send-email.ts"), "utf8")

    expect(route).toContain("requireAdmin")
    expect(route).toContain('const ADMIN_TEST_EMAIL = "ssa@ssasocial.com"')
    expect(route).toContain("generateVaultDropNonbuyerEmail")
    expect(route).toContain("generateVaultDropBuyerEmail")
    expect(route).toContain("idempotencyKey")
    expect(route).not.toContain("/api/vault/email-drop/process")

    expect(component).toContain("HTML preview")
    expect(component).toContain("Buyer email")
    expect(component).toContain("Free preview email")
    expect(component).toContain("sendTest(audience)")
    expect(component).toContain("srcDoc")

    expect(adminPage).toContain("VaultDropEmailPreview")
    expect(sendEmail).toContain("idempotencyKey?: string")
  })
})
