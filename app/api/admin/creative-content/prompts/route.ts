import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const prompts = await sql`
      SELECT 
        id,
        prompt_title,
        prompt_text,
        category,
        season,
        style,
        mood,
        tags,
        use_case,
        created_at,
        created_by
      FROM maya_prompt_suggestions
      ORDER BY created_at DESC
    `
    
    // Format the prompts to match the PromptCard interface
    const formattedPrompts = prompts.rows.map((p: any) => ({
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
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

