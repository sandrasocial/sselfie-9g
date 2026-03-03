import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"


export async function GET() {
  try {
    console.log("[v0] Fetching revenue history from database...")

    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stripe_payments'
      )
    `

    const revenueByDate = new Map<string, number>()

    if (tableExists[0]?.exists) {
      const historyRows = await sql`
        SELECT 
          DATE(COALESCE(payment_date, created_at)) as date,
          COALESCE(SUM(amount_cents), 0)::int as total_cents
        FROM stripe_payments
        WHERE status IN ('paid', 'succeeded')
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          AND COALESCE(payment_date, created_at) >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(COALESCE(payment_date, created_at))
        ORDER BY DATE(COALESCE(payment_date, created_at)) ASC
      `

      historyRows.forEach((row: any) => {
        const date = new Date(row.date).toISOString().split("T")[0]
        revenueByDate.set(date, Number(row.total_cents || 0))
      })
    } else {
      console.log("[v0] stripe_payments table not found - falling back to Stripe charges")

      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
      const charges = await stripe.charges.list({
        limit: 100,
        created: { gte: thirtyDaysAgo },
      })

      console.log("[v0] Stripe charges fetched:", charges.data.length)

      charges.data
        .filter((charge) => charge.paid && !charge.refunded && charge.livemode === true)
        .forEach((charge) => {
          const date = new Date(charge.created * 1000).toISOString().split("T")[0]
          const currentRevenue = revenueByDate.get(date) || 0
          revenueByDate.set(date, currentRevenue + charge.amount)
        })
    }

    const formattedHistory = Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: Math.round(revenue), // Revenue in cents
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

    console.log("[v0] Revenue history formatted:", formattedHistory.length, "data points")

    return NextResponse.json({ history: formattedHistory })
  } catch (error) {
    console.error("[v0] Error fetching revenue history:", error)
    return NextResponse.json({ history: [] }, { status: 200 })
  }
}
