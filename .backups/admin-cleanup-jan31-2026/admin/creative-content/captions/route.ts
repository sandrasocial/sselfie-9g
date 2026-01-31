import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    
    const captions = await sql`
      SELECT 
        id, caption_text, caption_type, hashtags, cta,
        image_description, tone, word_count, hook, created_at
      FROM instagram_captions
      WHERE created_by = ${ADMIN_EMAIL}
      ORDER BY created_at DESC
      LIMIT 100
    `
    
    const formattedCaptions = captions.map((c: any) => ({
      id: c.id,
      captionText: c.caption_text,
      captionType: c.caption_type,
      hashtags: c.hashtags || [],
      cta: c.cta,
      imageDescription: c.image_description,
      tone: c.tone,
      wordCount: c.word_count,
      hook: c.hook,
      createdAt: c.created_at,
      fullCaption: `${c.caption_text}\n\n${(c.hashtags || []).join(' ')}`
    }))
    
    return NextResponse.json({ captions: formattedCaptions })
  } catch (error: any) {
    console.error('[API] Error fetching captions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
