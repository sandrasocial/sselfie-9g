import { promises as fs } from "node:fs"
import { mkdirSync } from "node:fs"
import path from "node:path"
import * as dotenv from "dotenv"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

export const REPO_ROOT = path.resolve(process.cwd())
export const OUTPUT_DIR = path.join(REPO_ROOT, "output", "automation")

export function nowStamp(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${y}${m}${d}-${hh}${mm}${ss}`
}

export async function writeReport(prefix: string, lines: string[]): Promise<string> {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const filePath = path.join(OUTPUT_DIR, `${prefix}-${nowStamp()}.md`)
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8")
  return filePath
}

export async function walkFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkFiles(fullPath, fileList)
    } else {
      fileList.push(fullPath)
    }
  }
  return fileList
}

export function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/")
}

export function normalizeWorkspacePath(absPath: string): string {
  return toPosix(path.relative(REPO_ROOT, absPath))
}

export function isCodeFile(file: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8")
}

export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}
