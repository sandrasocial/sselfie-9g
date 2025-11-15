import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Fetching revenue history from Stripe...")
    
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
    })

    console.log("[v0] Stripe charges fetched:", charges.data.length)

    const revenueByDate = new Map<string, number>()
    
    charges.data
      .filter((charge) => charge.paid && !charge.refunded && charge.livemode === true)
      .forEach((charge) => {
        const date = new Date(charge.created * 1000).toISOString().split("T")[0]
        const currentRevenue = revenueByDate.get(date) || 0
        revenueByDate.set(date, currentRevenue + charge.amount)
      })

    const subscriptionRevenue = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) * 9900 as revenue
      FROM subscriptions
      WHERE 
        is_test_mode = FALSE
        AND status = 'active'
        AND product_type = 'sselfie_studio_membership'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
    `

    subscriptionRevenue.forEach((row: any) => {
      const date = row.date
      const currentRevenue = revenueByDate.get(date) || 0
      revenueByDate.set(date, currentRevenue + Number(row.revenue))
    })

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
