import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/show_up" as const

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "show_up",
    canonicalPath,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "show_up",
    canonicalPath,
    headOnly: true,
  })
}
