import { respondWithProtectedAcademyWorkbook } from "@/lib/academy-workbook-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const canonicalPath = "/academy/what_to_say" as const

export function GET(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "what_to_say",
    canonicalPath,
  })
}

export function HEAD(request: Request) {
  return respondWithProtectedAcademyWorkbook({
    request,
    productId: "what_to_say",
    canonicalPath,
    headOnly: true,
  })
}
