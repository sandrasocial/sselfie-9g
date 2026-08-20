import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/get_paid" as const

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "get_paid",
    canonicalPath,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "get_paid",
    canonicalPath,
    headOnly: true,
  })
}
