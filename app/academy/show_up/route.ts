import { readFile } from "node:fs/promises"
import path from "node:path"

import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/show_up" as const
const workbookPath = path.join(process.cwd(), "server/academy-workbooks/show_up/index.html")
const readWorkbook = () => readFile(workbookPath, "utf8")

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "show_up",
    canonicalPath,
    readWorkbook,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "show_up",
    canonicalPath,
    headOnly: true,
    readWorkbook,
  })
}
