import { NextResponse } from "next/server"
import { neon } from "@/lib/db"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email parameter required" }, { status: 400 })
  }

  try {
    // Check email logs
    const emailLogs = await sql`
      SELECT * FROM email_logs 
      WHERE user_email = ${email}
      ORDER BY sent_at DESC
      LIMIT 10
    `

    // Check if user exists
    const users = await sql`
      SELECT id, email, created_at FROM users 
      WHERE email = ${email}
      LIMIT 1
    `

    // Check subscriptions
    const subscriptions = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${users[0]?.id}
      ORDER BY created_at DESC
      LIMIT 5
    `

    // Check credits
    const credits = await sql`
      SELECT * FROM user_credits 
      WHERE user_id = ${users[0]?.id}
      LIMIT 1
    `

    return NextResponse.json({
      email,
      user: users[0] || null,
      emailLogs,
      subscriptions,
      credits: credits[0] || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
