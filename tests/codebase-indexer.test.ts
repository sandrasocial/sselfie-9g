import { mkdtemp, mkdir, writeFile } from "fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "vitest"

import { runCodebaseReindex } from "@/lib/ai/codebase-indexer"

const tempDirs: string[] = []

describe("runCodebaseReindex", () => {
  afterEach(async () => {
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
      await import("fs/promises").then((fs) => fs.rm(dir, { recursive: true, force: true }))
    }
  })

  it("indexes supported files and skips backup/system paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "sselfie-indexer-"))
    tempDirs.push(root)

    await mkdir(join(root, "app"), { recursive: true })
    await mkdir(join(root, "node_modules", "pkg"), { recursive: true })
    await mkdir(join(root, ".backups", "old"), { recursive: true })

    await writeFile(join(root, "app", "route.ts"), "export const value = 1\n")
    await writeFile(join(root, "node_modules", "pkg", "index.ts"), "export const ignore = true\n")
    await writeFile(join(root, ".backups", "old", "notes.md"), "# backup\n")
    await writeFile(join(root, "empty.ts"), "   \n")

    const indexedFiles: string[] = []
    const result = await runCodebaseReindex({
      rootDir: root,
      delayMs: 0,
      indexFile: async (filePath) => {
        indexedFiles.push(filePath)
      },
    })

    expect(result.indexed).toBe(1)
    expect(result.errors).toBe(0)
    expect(indexedFiles).toEqual(["app/route.ts"])
    expect(result.skipped).toBeGreaterThan(0)
  })
})
