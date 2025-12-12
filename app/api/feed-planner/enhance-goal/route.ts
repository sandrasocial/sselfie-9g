import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { goalText } = await req.json()

    if (!goalText || goalText.trim().length === 0) {
      return NextResponse.json({ error: "Goal text is required" }, { status: 400 })
    }

    // Get user's brand profile data
    const [brandProfile] = await sql`
      SELECT 
        brand_voice,
        brand_vibe,
        business_type,
        target_audience,
        content_pillars,
        color_palette
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND is_completed = true
      LIMIT 1
    `

    // Build brand context for the enhancement
    let brandContext = ""
    if (brandProfile) {
      brandContext = `\n\nHere's what we know about their brand:\n`
      
      if (brandProfile.brand_voice) {
        brandContext += `- Brand Voice: ${brandProfile.brand_voice}\n`
      }
      if (brandProfile.brand_vibe) {
        brandContext += `- Brand Vibe: ${brandProfile.brand_vibe}\n`
      }
      if (brandProfile.business_type) {
        brandContext += `- Business Type: ${brandProfile.business_type}\n`
      }
      if (brandProfile.target_audience) {
        brandContext += `- Target Audience: ${brandProfile.target_audience}\n`
      }
      if (brandProfile.content_pillars) {
        try {
          const pillars = typeof brandProfile.content_pillars === "string" 
            ? JSON.parse(brandProfile.content_pillars) 
            : brandProfile.content_pillars
          if (Array.isArray(pillars) && pillars.length > 0) {
            const pillarNames = pillars.map((p: any) => typeof p === "object" ? p.name || p : p).join(", ")
            brandContext += `- Content Pillars: ${pillarNames}\n`
          }
        } catch (e) {
          if (typeof brandProfile.content_pillars === "string") {
            brandContext += `- Content Pillars: ${brandProfile.content_pillars}\n`
          }
        }
      }
      
      brandContext += `\nUse this brand info to make the enhancement more specific to them and their style.\n`
    }

    const { text: enhancedGoal } = await generateText({
      model: "anthropic/claude-haiku-4.5",
      prompt: `You're Maya, a warm and friendly personal branding expert who helps people express themselves.

Someone wrote this about their Instagram feed goal:
"${goalText}"${brandContext}

Make it better! Make it:
- More detailed and strategic
- Clearer about what they want
- More specific about their content
- Use their brand info if you have it (voice, vibe, content pillars)
- Keep it real and authentic
- 2-3x longer with more details

Keep it simple and genuine. Don't make it sound fake or corporate.
Just write the better version, no explanations.`,
    })

    return NextResponse.json({ enhancedGoal: enhancedGoal.trim() })
  } catch (error) {
    console.error("[v0] Enhance goal error:", error)
    return NextResponse.json({ error: "Failed to enhance goal" }, { status: 500 })
  }
}
