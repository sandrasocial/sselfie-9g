import { NextResponse } from 'next/server'
import { sql } from "@/lib/db/client"


export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    await sql`
      DELETE FROM instagram_captions
      WHERE id = ${id}
    `
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting caption:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete caption' },
      { status: 500 }
    )
  }
}
