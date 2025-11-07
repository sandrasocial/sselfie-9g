import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    return NextResponse.json({
      email: session.customer_details?.email || session.customer_email,
      status: session.status,
      sessionId: session.id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
