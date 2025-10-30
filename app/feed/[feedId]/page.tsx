import { notFound } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import FeedPublishingHub from "@/components/sselfie/feed-publishing-hub"

const sql = neon(process.env.DATABASE_URL!)

interface PageProps {
  params: {
    feedId: string
  }
}

export default async function FeedPage({ params }: PageProps) {
  const { feedId } = params

  try {
    // Fetch feed data
    const feedLayouts = await sql`
      SELECT * FROM feed_layouts
      WHERE id = ${feedId}
      LIMIT 1
    `

    if (feedLayouts.length === 0) {
      notFound()
    }

    const feedLayout = feedLayouts[0]

    // Fetch posts
    const feedPosts = await sql`
      SELECT * FROM feed_posts
      WHERE feed_layout_id = ${feedId}
      ORDER BY position ASC
    `

    const bios = await sql`
      SELECT * FROM instagram_bios
      WHERE feed_layout_id = ${feedId}
      LIMIT 1
    `

    const highlights = await sql`
      SELECT * FROM highlight_covers
      WHERE feed_layout_id = ${feedId}
      ORDER BY created_at ASC
    `

    return (
      <FeedPublishingHub
        feedId={feedId}
        feedLayout={feedLayout}
        posts={feedPosts}
        bio={bios[0] || null}
        highlights={highlights || []}
      />
    )
  } catch (error) {
    console.error("[v0] Error loading feed:", error)
    notFound()
  }
}
