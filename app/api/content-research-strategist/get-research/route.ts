import { neon } from "@neondatabase/serverless"
import { getCurrentNeonUser } from "@/lib/user-sync"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const user = await getCurrentNeonUser()
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const niche = searchParams.get("niche")

    if (!niche) {
      return Response.json({ error: "Niche is required" }, { status: 400 })
    }

    // Get latest research for this user and niche
    const research = await sql`
      SELECT * FROM content_research
      WHERE user_id = ${user.id} AND niche = ${niche}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (research.length === 0) {
      return Response.json({ research: null })
    }

    return Response.json({ research: research[0] })
  } catch (error) {
    console.error("[v0] Get research error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
