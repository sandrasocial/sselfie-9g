import { readFile } from "node:fs/promises"
import path from "node:path"

import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/get_paid" as const
const workbookPath = path.join(process.cwd(), "server/academy-workbooks/get_paid/index.html")
const readWorkbook = () => readFile(workbookPath, "utf8")

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "get_paid",
    canonicalPath,
    readWorkbook,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "get_paid",
    canonicalPath,
    headOnly: true,
    readWorkbook,
  })
}
