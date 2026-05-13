import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Scene Composer is retired" }, { status: 410 })
}
