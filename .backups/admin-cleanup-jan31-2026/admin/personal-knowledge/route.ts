import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const stories = await sql`
      SELECT * FROM admin_personal_story 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `
    
    const samples = await sql`
      SELECT id, content_type, sample_text, context, performance_score, created_at
      FROM admin_writing_samples 
      ORDER BY created_at DESC
    `
    
    return NextResponse.json({ stories, samples })
  } catch (error) {
    console.error("[v0] Error fetching personal knowledge:", error)
    return NextResponse.json({ error: "Failed to fetch personal knowledge" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body
    
    if (type === "story") {
      const { story_type, title, content } = data
      
      const result = await sql`
        INSERT INTO admin_personal_story (story_type, title, content)
        VALUES (${story_type}, ${title}, ${content})
        RETURNING *
      `
      
      return NextResponse.json({ story: result[0] })
    } else if (type === "sample") {
      const { content_type, sample_text, context, performance_score } = data
      
      const result = await sql`
        INSERT INTO admin_writing_samples (content_type, sample_text, context, performance_score)
        VALUES (${content_type}, ${sample_text}, ${context}, ${performance_score || 0.8})
        RETURNING id, content_type, sample_text, context, performance_score, created_at
      `
      
      return NextResponse.json({ sample: result[0] })
    }
    
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error creating personal knowledge:", error)
    return NextResponse.json({ error: "Failed to create personal knowledge" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { type, id, data } = body
    
    if (type === "story") {
      const { story_type, title, content, is_active } = data
      
      const result = await sql`
        UPDATE admin_personal_story
        SET 
          story_type = ${story_type},
          title = ${title},
          content = ${content},
          is_active = ${is_active},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `
      
      return NextResponse.json({ story: result[0] })
    } else if (type === "sample") {
      const { content_type, sample_text, context, performance_score } = data
      
      const result = await sql`
        UPDATE admin_writing_samples
        SET 
          content_type = ${content_type},
          sample_text = ${sample_text},
          context = ${context},
          performance_score = ${performance_score}
        WHERE id = ${id}
        RETURNING id, content_type, sample_text, context, performance_score, created_at
      `
      
      return NextResponse.json({ sample: result[0] })
    }
    
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error updating personal knowledge:", error)
    return NextResponse.json({ error: "Failed to update personal knowledge" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")
    
    if (!id || !type) {
      return NextResponse.json({ error: "Missing id or type" }, { status: 400 })
    }
    
    if (type === "story") {
      await sql`
        UPDATE admin_personal_story 
        SET is_active = false
        WHERE id = ${id}
      `
    } else if (type === "sample") {
      await sql`
        DELETE FROM admin_writing_samples 
        WHERE id = ${id}
      `
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting personal knowledge:", error)
    return NextResponse.json({ error: "Failed to delete personal knowledge" }, { status: 500 })
  }
}
