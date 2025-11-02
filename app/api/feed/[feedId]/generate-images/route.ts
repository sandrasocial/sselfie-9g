import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been deprecated. Please generate images one at a time by clicking each post placeholder.",
    },
    { status: 410 }, // 410 Gone
  )
}
