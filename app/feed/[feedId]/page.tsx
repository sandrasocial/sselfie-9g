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
    const userId = feedLayout.user_id

    const [userProfile] = await sql`
      SELECT instagram_handle, full_name FROM user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const [brandOnboarding] = await sql`
      SELECT business_name, instagram_handle FROM brand_onboarding
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const [personalBrand] = await sql`
      SELECT name FROM user_personal_brand
      WHERE user_id = ${userId}
      AND is_completed = true
      LIMIT 1
    `

    // Determine the best username and brand name
    const instagramHandle = userProfile?.instagram_handle || brandOnboarding?.instagram_handle || "yourbrand"
    const brandName = brandOnboarding?.business_name || personalBrand?.name || userProfile?.full_name || "Your Brand"
    // </CHANGE>

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
        username={instagramHandle}
        brandName={brandName}
      />
    )
  } catch (error) {
    console.error("[v0] Error loading feed:", error)
    notFound()
  }
}
