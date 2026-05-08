import { promises as fs } from "node:fs"
import path from "node:path"

const roots = ["app", "components"]
const extensions = new Set([".ts", ".tsx"])
const hexPattern = /#[0-9a-fA-F]{3,6}/g

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, files)
      continue
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

const matchesByFile = new Map()

for (const root of roots) {
  const files = await walk(root)
  for (const file of files) {
    const contents = await fs.readFile(file, "utf8")
    const matches = contents.match(hexPattern) || []
    if (matches.length > 0) {
      matchesByFile.set(file, matches.length)
    }
  }
}

const total = [...matchesByFile.values()].reduce((sum, count) => sum + count, 0)
const topFiles = [...matchesByFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)

if (total === 0) {
  console.log("Token lint: no hardcoded hex colors found in app/ or components/.")
  process.exit(0)
}

console.warn(`Token lint warning: ${total} hardcoded hex color instance(s) remain in app/ and components/.`)
console.warn("Use CSS variables, Tailwind token aliases, or lib/design-tokens.ts.")
console.warn("")
console.warn("Top files:")
for (const [file, count] of topFiles) {
  console.warn(`- ${count.toString().padStart(3, " ")} ${file}`)
}

process.exit(0)
