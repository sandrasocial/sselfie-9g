// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8")

describe("Vault Maya paid product shell", () => {
  const studio = read("components/vault-maya/vault-maya-studio.tsx")
  const page = read("app/vault-maya/studio/page.tsx")

  it("separates creating, the photo library, and account management", () => {
    expect(studio).toContain('type StudioTab = "create" | "gallery" | "account"')
    expect(studio).toContain("Create")
    expect(studio).toContain("My photos")
    expect(studio).toContain("Account")
  })

  it("opens collections and photos in focused views instead of one expanded catalogue", () => {
    expect(studio).toContain("CollectionDetail")
    expect(studio).toContain("ImageLightbox")
    expect(studio).not.toContain("<details")
    expect(studio).not.toContain("Tap a photo to save it")
  })

  it("uses the complete Vault Maya gallery instead of truncating it to 18 photos", () => {
    expect(studio).not.toContain(".slice(0, 18)")
    expect(studio).toContain('generationRef.includes("-vault-maya-")')
  })

  it("collects direct accepted-photo feedback", () => {
    expect(studio).toContain("vault_maya_photo_loved")
    expect(studio).toContain("vault_maya_photo_not_quite")
    expect(studio).toContain("Love this")
    expect(studio).toContain("Not quite")
  })

  it("manages up to four identity selfies from Account and sends all of them to Maya", () => {
    expect(page).toContain("initialSelfies")
    expect(page).toContain("LIMIT 4")
    expect(studio).toContain("const MAX_IDENTITY_SELFIES = 4")
    expect(studio).toContain("referenceSelfieUrls: selfies.map(selfie => selfie.url)")
    expect(studio).toContain("Add another selfie")
    expect(studio).toContain("Your selfies")
    expect(studio).toContain("imageId")
  })

  it("lets members manage selfies without leaving Create and select a batch from their device", () => {
    expect(studio).toContain("SelfieManagerModal")
    expect(studio).toContain("setSelfieManagerOpen(true)")
    expect(studio).toContain("Change selfies")
    expect(studio).toContain("multiple")
    expect(studio).toContain("Array.from(event.target.files ?? [])")
    expect(studio).toContain("uploadSelfies")
    expect(studio).not.toContain('onAddSelfie={() => switchTab("account")}')
  })

  it("accepts an inspiration image with Sandra's next-drop request", () => {
    const route = read("app/api/vault-maya/drop-requests/route.ts")

    expect(studio).toContain("requestInspiration")
    expect(studio).toContain('form.append("inspiration", requestInspiration)')
    expect(studio).toContain("Attach inspiration")
    expect(route).toContain('request.headers.get("content-type")')
    expect(route).toContain("request.formData()")
    expect(route).toContain("vault-maya/drop-request-inspiration/")
    expect(route).toContain("inspo_image_url")
  })

  it("offers a focused top-up prompt when a member has five photos or fewer", () => {
    expect(studio).toContain("LOW_CREDIT_THRESHOLD = 5")
    expect(studio).toContain("VaultMayaCreditModal")
    expect(studio).toContain("setCreditModalOpen(true)")
    expect(studio).toContain("Top up photos")
    expect(studio).toContain('href="/checkout/credits"')
  })
})
