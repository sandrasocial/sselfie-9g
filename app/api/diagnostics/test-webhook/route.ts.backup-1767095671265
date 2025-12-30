import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: Request) {
  try {
    console.log("[v0] 🧪 Test webhook endpoint called")

    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    console.log("[v0] Body length:", body.length)
    console.log("[v0] Signature present:", !!signature)
    console.log("[v0] Webhook secret configured:", !!process.env.STRIPE_WEBHOOK_SECRET)

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "STRIPE_WEBHOOK_SECRET not configured",
        },
        { status: 500 },
      )
    }

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "No stripe-signature header",
        },
        { status: 400 },
      )
    }

    // Try to verify signature
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    })

    try {
      const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)

      console.log("[v0] ✅ Signature verified successfully!")
      console.log("[v0] Event type:", event.type)

      return NextResponse.json({
        success: true,
        message: "Webhook signature verified successfully",
        eventType: event.type,
      })
    } catch (err: any) {
      console.error("[v0] ❌ Signature verification failed:", err.message)
      return NextResponse.json(
        {
          success: false,
          error: "Signature verification failed",
          details: err.message,
        },
        { status: 400 },
      )
    }
  } catch (error: any) {
    console.error("[v0] Test webhook error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test webhook endpoint is reachable",
    instructions: "Use Stripe CLI to test: stripe trigger checkout.session.completed",
  })
}
