import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Standalone Brand Strategy Pack is retired" }, { status: 410 })
}
