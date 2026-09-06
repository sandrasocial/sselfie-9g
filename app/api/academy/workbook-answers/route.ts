import { NextResponse } from "next/server"
import {
  requireAcademyProductAccess,
  academyRouteErrorToResponse,
} from "@/lib/academy-server-access"
import {
  isWorkbookId,
  readWorkbookAnswers,
  validateWorkbookAnswers,
  writeWorkbookAnswers,
} from "@/lib/academy/workbook-answers"

export const dynamic = "force-dynamic"
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "CDN-Cache-Control": "no-store",
}
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })

export async function GET(request: Request) {
  try {
    const productId = new URL(request.url).searchParams.get("productId")
    if (!isWorkbookId(productId)) return json({ error: "Unknown workbook" }, 400)
    const { neonUser } = await requireAcademyProductAccess(productId)
    const books = await readWorkbookAnswers(neonUser.id)
    return json({ userId: neonUser.id, workbook: books.find(book => book.productId === productId) })
  } catch (error) {
    return (
      academyRouteErrorToResponse(error) ||
      json({ error: "Your answers could not be loaded. Please try again." }, 503)
    )
  }
}

export async function PUT(request: Request) {
  try {
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin
    ) {
      return json({ error: "Invalid request origin" }, 403)
    }
    const raw = await request.text()
    if (raw.length > 125_000)
      return json({ error: "Workbook answers are too long. Nothing was changed." }, 413)
    let body
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ error: "Invalid workbook answers" }, 400)
    }
    const { productId, answers, revision } = body || {}
    if (
      !isWorkbookId(productId) ||
      !validateWorkbookAnswers(answers) ||
      !Number.isSafeInteger(revision) ||
      revision < 0
    ) {
      return json({ error: "Invalid workbook answers. Nothing was changed." }, 400)
    }
    const { neonUser } = await requireAcademyProductAccess(productId)
    if (body.userId !== neonUser.id)
      return json(
        { error: "Your signed-in account changed. Reopen the workbook before saving." },
        409
      )
    const saved = await writeWorkbookAnswers(neonUser.id, productId, answers, revision)
    if (!saved)
      return json(
        {
          error:
            "This workbook changed on another tab or device. Your edits are kept in this browser. Reload to compare before saving again.",
        },
        409
      )
    return json(saved)
  } catch (error) {
    return (
      academyRouteErrorToResponse(error) ||
      json({ error: "Your answers have not reached Maya. Please try saving again." }, 503)
    )
  }
}
