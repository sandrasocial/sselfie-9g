import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const groundingPath = resolve(root, "lib/content/grounding.ts")
const constitutionRelativePath = "docs/brand/SSELFIE_BRAND_CONSTITUTION.md"
const constitutionPath = resolve(root, constitutionRelativePath)
const sourceDocs = [
  constitutionRelativePath,
  "docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md",
  "docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md",
  "docs/brand/source/2026-06-27/SANDRA_EXPERTISE.md",
  "docs/brand/source/2026-06-27/SSELFIE_REWRITTEN_STORY_BANK.md",
  "docs/brand/source/2026-06-27/SSELFIE_TARGET_AUDIENCE_PERSONA.md",
  "docs/brand/source/2026-06-27/SSELFIE_VOICE_STYLE_GUIDE.md",
]

type ConstitutionMachineBlock = {
  source: string
  destination: string
  bridge: string
  startingTool: string
  accelerator: string
  coreMessage: string
  businessPath: string[]
  freedomMeans: string[]
  guardrails: string[]
  audienceTemperature: string
}

const constitution = readFileSync(constitutionPath, "utf8")
const sourceMatch = constitution.match(
  /<!-- BRAND_CONSTITUTION_JSON_START\s*([\s\S]*?)\s*BRAND_CONSTITUTION_JSON_END -->/,
)

if (!sourceMatch?.[1]) {
  throw new Error(`Missing canonical machine block in ${constitutionRelativePath}`)
}

const parsed = JSON.parse(sourceMatch[1]) as ConstitutionMachineBlock
const requiredStringKeys: Array<keyof ConstitutionMachineBlock> = [
  "source",
  "destination",
  "bridge",
  "startingTool",
  "accelerator",
  "coreMessage",
  "audienceTemperature",
]
const requiredArrayKeys: Array<keyof ConstitutionMachineBlock> = [
  "businessPath",
  "freedomMeans",
  "guardrails",
]

for (const key of requiredStringKeys) {
  if (typeof parsed[key] !== "string" || !parsed[key]) {
    throw new Error(`Invalid ${String(key)} in ${constitutionRelativePath}`)
  }
}
for (const key of requiredArrayKeys) {
  if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
    throw new Error(`Invalid ${String(key)} in ${constitutionRelativePath}`)
  }
}
if (parsed.source !== constitutionRelativePath) {
  throw new Error(`Machine block source must remain ${constitutionRelativePath}`)
}

const generatedBlock = [
  "// BRAND_CONSTITUTION_GENERATED_START",
  `// Generated from ${constitutionRelativePath} by pnpm sync:grounding.`,
  "// Do not edit this block by hand.",
  `export const BRAND_CONSTITUTION = ${JSON.stringify(parsed, null, 2)} as const`,
  "// BRAND_CONSTITUTION_GENERATED_END",
].join("\n")

const grounding = readFileSync(groundingPath, "utf8")
const generatedPattern =
  /\/\/ BRAND_CONSTITUTION_GENERATED_START[\s\S]*?\/\/ BRAND_CONSTITUTION_GENERATED_END/

if (!generatedPattern.test(grounding)) {
  throw new Error("Missing generated Constitution markers in lib/content/grounding.ts")
}

const nextGrounding = grounding.replace(generatedPattern, generatedBlock)
writeFileSync(groundingPath, nextGrounding)

console.log(
  JSON.stringify({
    ok: true,
    grounding: "lib/content/grounding.ts",
    canonicalSource: constitutionRelativePath,
    sources: sourceDocs,
  }),
)
