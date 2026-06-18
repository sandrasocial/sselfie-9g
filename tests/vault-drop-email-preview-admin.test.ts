import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Vault drop email admin workflow", () => {
  it("renders both audience previews and supports the admin approved live workflow", () => {
    const root = process.cwd()
    const route = fs.readFileSync(path.join(root, "app/api/admin/vault-drop-email/route.ts"), "utf8")
    const workflow = fs.readFileSync(path.join(root, "lib/admin/vault-drop-email-workflow.ts"), "utf8")
    const component = fs.readFileSync(path.join(root, "components/admin/vault-drop-email-preview.tsx"), "utf8")
    const adminPage = fs.readFileSync(path.join(root, "app/admin/content-brief/page.tsx"), "utf8")
    const sendEmail = fs.readFileSync(path.join(root, "lib/email/send-email.ts"), "utf8")

    expect(route).toContain("requireAdmin")
    expect(route).toContain('const ADMIN_TEST_EMAIL = "ssa@ssasocial.com"')
    expect(route).toContain("getVaultDropEmailPreview")
    expect(workflow).toContain("generateVaultDropNonbuyerEmail")
    expect(workflow).toContain("generateVaultDropBuyerEmail")
    expect(workflow).toContain("createVaultDropLiveRun")
    expect(route).toContain("idempotencyKey")
    expect(route).toContain('action === "send_live_now"')
    expect(route).toContain('action === "process_batch"')
    expect(route).toContain("/api/vault/email-drop/process")

    expect(component).toContain("HTML preview")
    expect(component).toContain("Buyer email")
    expect(component).toContain("Free preview email")
    expect(component).toContain("sendTest(audience)")
    expect(component).toContain("sendLiveNow")
    expect(component).toContain("Send live now")
    expect(component).toContain("Continue sending")
    expect(component).toContain("processBatch")
    expect(component).toContain("selectedCollectionIds")
    expect(component).toContain("srcDoc")
    expect(component).not.toContain("No emails have sent yet")

    expect(adminPage).toContain("VaultDropEmailPreview")
    expect(sendEmail).toContain("idempotencyKey?: string")
  })

  it("locks the live processor to the collections stored on the run", () => {
    const root = process.cwd()
    const processRoute = fs.readFileSync(path.join(root, "app/api/vault/email-drop/process/route.ts"), "utf8")
    const dropLog = fs.readFileSync(path.join(root, "lib/vault/drop-log.ts"), "utf8")
    const buyerTemplate = fs.readFileSync(path.join(root, "lib/email/templates/vault-drop-buyer.ts"), "utf8")
    const nonbuyerTemplate = fs.readFileSync(path.join(root, "lib/email/templates/vault-drop-nonbuyer.ts"), "utf8")

    expect(dropLog).toContain("getVaultDropCollectionsByIds")
    expect(processRoute).toContain("getVaultDropCollectionsByIds(run.collection_slugs)")
    expect(processRoute).not.toContain("const pendingCollections = await getPendingCollections()")
    expect(buyerTemplate).not.toContain('c.id === "dark-balcony"')
    expect(nonbuyerTemplate).not.toContain('c.id === "dark-balcony"')
  })

  it("keeps the secret drop start endpoint aligned with the admin-reviewed workflow", () => {
    const root = process.cwd()
    const publicRoute = fs.readFileSync(path.join(root, "app/api/vault/email-drop/route.ts"), "utf8")

    expect(publicRoute).toContain("getVaultDropEmailPreview")
    expect(publicRoute).toContain("createVaultDropLiveRun")
    expect(publicRoute).toContain("selectedVaultDropIdsFromInput")
    expect(publicRoute).toContain("preview.selectedCollectionIds")
    expect(publicRoute).toContain("Select two queued Shoot Studio collections")
    expect(publicRoute).not.toContain("getPendingCollections()")
    expect(publicRoute).not.toContain("Ensure migration 20260527_vault_drop_runs.sql has been applied")
  })
})
