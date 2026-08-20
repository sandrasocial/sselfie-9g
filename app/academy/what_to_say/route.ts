import { readFile } from "node:fs/promises"
import path from "node:path"

import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/what_to_say" as const
const workbookPath = path.join(
  process.cwd(),
  "server/academy-workbooks/what_to_say/index.html"
)
const readWorkbook = () => readFile(workbookPath, "utf8")

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "what_to_say",
    canonicalPath,
    readWorkbook,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "what_to_say",
    canonicalPath,
    headOnly: true,
    readWorkbook,
  })
}
