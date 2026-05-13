import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Transform is retired" }, { status: 410 })
}
