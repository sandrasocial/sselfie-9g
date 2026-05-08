// @vitest-environment node
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

describe("design token hardcoding lint", () => {
  it("keeps hardcoded hex colors as lint warnings while migration is in progress", () => {
    const eslintConfig = JSON.parse(fs.readFileSync(path.join(ROOT, ".eslintrc.json"), "utf8"))
    const rule = eslintConfig.rules["no-restricted-syntax"]

    expect(rule[0]).toBe("warn")
    expect(JSON.stringify(rule)).toContain("#[0-9a-fA-F]{3,6}")

    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
    expect(packageJson.scripts["lint:tokens"]).toContain("lint-hardcoded-tokens")
  })
})
