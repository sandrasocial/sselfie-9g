// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8")

describe("Vault Maya paid product shell", () => {
  const studio = read("components/vault-maya/vault-maya-studio.tsx")

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
})
