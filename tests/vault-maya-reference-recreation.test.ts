// @vitest-environment node

import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  resolveVaultMayaInspirationMode,
  VAULT_MAYA_IDENTITY_PRESERVATION,
  VAULT_MAYA_REFERENCE_MODE,
} from "@/lib/vault-maya/reference-recreation"

const ROOT = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8")

describe("Vault Maya reference recreation", () => {
  it("uses close recreation for a Vault Maya photo without changing other style-led photos", () => {
    expect(
      resolveVaultMayaInspirationMode({
        format: "photo",
        requestedMode: VAULT_MAYA_REFERENCE_MODE,
        styleLedSession: true,
      })
    ).toBe("close-recreation")

    expect(
      resolveVaultMayaInspirationMode({
        format: "photo",
        requestedMode: null,
        styleLedSession: true,
      })
    ).toBe("style-accent")
  })

  it("does not override photoshoot or graphic inspiration behavior", () => {
    expect(
      resolveVaultMayaInspirationMode({
        format: "photoshoot",
        requestedMode: VAULT_MAYA_REFERENCE_MODE,
        styleLedSession: true,
      })
    ).toBe("style-accent")
  })

  it("wires the tapped Vault image from the trusted brief response into generation", () => {
    const briefRoute = read("app/api/vault-maya/brief/route.ts")
    const studio = read("components/vault-maya/vault-maya-studio.tsx")
    const generateRoute = read("app/api/app-v3/maya/generate/route.ts")

    expect(briefRoute).toContain("inspirationImageUrl: resolved.card.exampleImage || null")
    expect(briefRoute).toContain(
      "referenceMode: resolved.card.exampleImage ? VAULT_MAYA_REFERENCE_MODE : null"
    )
    expect(studio).toContain("inspirationImageUrl: briefData.inspirationImageUrl")
    expect(studio).toContain("referenceMode: briefData.referenceMode")
    expect(generateRoute).toContain("resolveVaultMayaInspirationMode")
  })

  it("preserves the member's real face and body without changing the shared SUITE prompt", () => {
    const generateRoute = read("app/api/app-v3/maya/generate/route.ts")
    const sharedIngredients = read("lib/app-v3/maya/ingredients.ts")

    expect(VAULT_MAYA_IDENTITY_PRESERVATION).toContain("natural body shape and build")
    expect(VAULT_MAYA_IDENTITY_PRESERVATION).toContain("shoulder width")
    expect(VAULT_MAYA_IDENTITY_PRESERVATION).toContain("waist-to-hip relationship")
    expect(VAULT_MAYA_IDENTITY_PRESERVATION).toContain("Do not slim")
    expect(generateRoute).toContain("VAULT_MAYA_IDENTITY_PRESERVATION")
    expect(generateRoute).toContain("vaultMayaCardKey ? VAULT_MAYA_IDENTITY_PRESERVATION")
    expect(generateRoute).toContain("Image 1 is her primary selfie - the only source for her face.")
    expect(sharedIngredients).not.toContain("VAULT_MAYA_IDENTITY_PRESERVATION")
  })
})
