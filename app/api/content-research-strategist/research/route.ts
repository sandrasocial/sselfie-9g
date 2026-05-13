import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Content research strategist is retired" }, { status: 410 })
}
