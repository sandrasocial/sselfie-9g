import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "Scene Composer is retired" }, { status: 410 })
}
