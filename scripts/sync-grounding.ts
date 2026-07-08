import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const groundingPath = resolve(root, "lib/content/grounding.ts")
const sourceDocs = [
  "docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md",
  "docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md",
  "docs/brand/source/2026-06-27/SANDRA_EXPERTISE.md",
  "docs/brand/source/2026-06-27/SSELFIE_REWRITTEN_STORY_BANK.md",
  "docs/brand/source/2026-06-27/SSELFIE_TARGET_AUDIENCE_PERSONA.md",
  "docs/brand/source/2026-06-27/SSELFIE_VOICE_STYLE_GUIDE.md",
]

const requiredSignals = ["personal brand", "one selfie", "phone", "Sandra", "SSELFIE"]

const grounding = readFileSync(groundingPath, "utf8")
const docs = sourceDocs
  .map(path => readFileSync(resolve(root, path), "utf8"))
  .join("\n\n")

const missingInDocs = requiredSignals.filter(signal => !docs.toLowerCase().includes(signal.toLowerCase()))
const missingInGrounding = requiredSignals.filter(signal =>
  !grounding.toLowerCase().includes(signal.toLowerCase())
)

if (missingInDocs.length || missingInGrounding.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        missingInDocs,
        missingInGrounding,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}

const header = [
  "// Machine-readable source synced from Sandra's canonical brand docs.",
  "// Edit docs first, run `pnpm sync:grounding`, commit docs and this file together.",
  "",
].join("\n")

const body = grounding.replace(
  /^(?:\/\/ Machine-readable source.*\n\/\/ Edit docs.*\n)+/,
  "",
)
writeFileSync(groundingPath, `${header}${body}`)

console.log(
  JSON.stringify({
    ok: true,
    grounding: "lib/content/grounding.ts",
    sources: sourceDocs,
  }),
)
