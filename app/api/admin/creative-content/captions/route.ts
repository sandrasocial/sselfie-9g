import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const captions = await sql`
      SELECT 
        id,
        caption_text,
        caption_type,
        tone,
        hashtags,
        call_to_action,
        created_at,
        created_by
      FROM instagram_captions
      ORDER BY created_at DESC
    `
    
    return NextResponse.json({ captions: captions.rows })
  } catch (error: any) {
    console.error('Error fetching captions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch captions' },
      { status: 500 }
    )
  }
}

