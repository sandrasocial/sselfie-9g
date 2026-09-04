import { readFile } from "node:fs/promises"
import path from "node:path"

import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/ai_photo_prompts" as const
const promptPackPath = path.join(
  process.cwd(),
  "server/academy-workbooks/ai_photo_prompts/index.html",
)
const readPromptPack = () => readFile(promptPackPath, "utf8")

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "ai_photo_prompts",
    canonicalPath,
    readWorkbook: readPromptPack,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "ai_photo_prompts",
    canonicalPath,
    headOnly: true,
    readWorkbook: readPromptPack,
  })
}
