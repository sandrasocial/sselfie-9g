// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8")

describe("Vault Maya landing design tokens", () => {
  it("uses the Noir Glass Obsidian token for the original-selfie shadow", () => {
    const styles = read("components/vault-maya/vault-maya-landing.module.css")

    expect(styles).toContain(
      "box-shadow: 0 18px 52px color-mix(in srgb, var(--ss-brand-obsidian) 40%, transparent);"
    )
    expect(styles).not.toContain("box-shadow: 0 18px 52px rgba(13, 14, 16, 0.4);")
  })
})
