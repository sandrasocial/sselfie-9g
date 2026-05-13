import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Stella bridge is retired" }, { status: 410 })
}
