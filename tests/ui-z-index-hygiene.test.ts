// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const SOURCE_DIRECTORIES = ["app", "components"]
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])
const INVALID_Z_INDEX_REGEX = /\bz-(100|150)\b/

function walk(relativeDirectory: string): string[] {
  const absoluteDirectory = path.join(ROOT, relativeDirectory)
  const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name)

    if (entry.isDirectory()) {
      return walk(relativePath)
    }

    return CODE_EXTENSIONS.has(path.extname(entry.name)) ? [relativePath] : []
  })
}

describe("ui z-index hygiene", () => {
  it("avoids unsupported raw Tailwind z-index utilities in app surfaces", () => {
    const offenders = SOURCE_DIRECTORIES.flatMap((directory) => walk(directory)).filter((relativePath) =>
      INVALID_Z_INDEX_REGEX.test(fs.readFileSync(path.join(ROOT, relativePath), "utf8")),
    )

    expect(offenders).toEqual([])
  })
})
