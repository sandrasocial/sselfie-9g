import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "Transform is retired" }, { status: 410 })
}
