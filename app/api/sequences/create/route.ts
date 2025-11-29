import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO email_sequences (name, description, created_at, updated_at)
      VALUES (${name}, ${description || null}, NOW(), NOW())
      RETURNING id
    `

    return NextResponse.json({ success: true, sequenceId: result[0].id })
  } catch (error) {
    console.error("[API] Error creating sequence:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
