import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error: "Workbook drafts are retired while we rebuild this feature.",
    },
    { status: 410 },
  )
}
