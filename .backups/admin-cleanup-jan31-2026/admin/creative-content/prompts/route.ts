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
    
    const prompts = await sql`
      SELECT 
        id, prompt_title, prompt_text, category, season, style,
        mood, tags, use_case, created_at
      FROM maya_prompt_suggestions
      WHERE created_by = ${ADMIN_EMAIL}
      ORDER BY created_at DESC
      LIMIT 100
    `
    
    const formattedPrompts = prompts.map((p: any) => ({
      id: p.id,
      title: p.prompt_title,
      promptText: p.prompt_text,
      category: p.category,
      season: p.season,
      style: p.style,
      mood: p.mood,
      tags: p.tags || [],
      useCase: p.use_case,
      createdAt: p.created_at
    }))
    
    return NextResponse.json({ prompts: formattedPrompts })
  } catch (error: any) {
    console.error('[API] Error fetching prompts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
