// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Vault Maya is included inside SUITE", () => {
  it("keeps a permanent Vault Maya doorway in the member Library", () => {
    const route = read("app/api/app-v3/library/route.ts")
    expect(route).toContain('id: "vault_maya"')
    expect(route).toContain('accessUrl: "/vault-maya/studio"')
    expect(route).toContain("Included with your SUITE")
  })

  it("shows members a dismissible in-app invitation without sending anything", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    expect(shell).toContain("VaultMayaIncludedNotice")
    expect(shell).toContain("Vault Maya is ready for you")
    expect(shell).toContain("Try Vault Maya")
    expect(shell).toContain("Not now")
  })

  it("tells SUITE members the Vault product is included rather than separately billed", () => {
    const page = read("app/vault-maya/studio/page.tsx")
    const studio = read("components/vault-maya/vault-maya-studio.tsx")
    expect(page).toContain('includedWithSuite={level === "member"}')
    expect(studio).toContain("Included with your SUITE")
  })
})
