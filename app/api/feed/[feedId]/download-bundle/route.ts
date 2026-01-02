import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import JSZip from "jszip"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    // Authenticate user
    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Resolve params
    const resolvedParams = await Promise.resolve(params)
    const feedId = resolvedParams.feedId
    const feedIdInt = Number.parseInt(feedId, 10)
    if (isNaN(feedIdInt)) {
      return NextResponse.json({ error: "Invalid feed ID format" }, { status: 400 })
    }

    // Validate feed ownership
    const [feed] = await sql`
      SELECT id, user_id, feed_story, visual_rhythm, layout_type
      FROM feed_layouts
      WHERE id = ${feedIdInt} AND user_id = ${neonUser.id}
      LIMIT 1
    `
    
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }

    // Get all posts with images
    const feedPosts = await sql`
      SELECT id, position, image_url, caption, post_type, content_pillar
      FROM feed_posts
      WHERE feed_layout_id = ${feedIdInt}
        AND user_id = ${neonUser.id}
        AND image_url IS NOT NULL
      ORDER BY position ASC
    `

    if (feedPosts.length === 0) {
      return NextResponse.json(
        { error: "No completed posts found" },
        { status: 400 }
      )
    }

    // Create ZIP file
    const zip = new JSZip()
    const imagesFolder = zip.folder("images")
    const captions: string[] = []

    // Download and add images
    for (const post of feedPosts) {
      try {
        // Fetch image
        const imageResponse = await fetch(post.image_url)
        if (!imageResponse.ok) {
          console.error(`[v0] [DOWNLOAD-BUNDLE] Failed to fetch image for post ${post.id}`)
          continue
        }

        const imageBlob = await imageResponse.blob()
        const imageExtension = post.image_url.split('.').pop()?.split('?')[0] || 'jpg'
        const filename = `${String(post.position).padStart(2, '0')}-post${post.position}.${imageExtension}`
        
        imagesFolder?.file(filename, imageBlob)

        // Add caption to captions array
        if (post.caption) {
          captions.push(`Post ${post.position}:\n${post.caption}\n\n`)
        }
      } catch (error) {
        console.error(`[v0] [DOWNLOAD-BUNDLE] Error processing post ${post.id}:`, error)
        // Continue with other posts even if one fails
      }
    }

    // Add captions file
    if (captions.length > 0) {
      zip.file("captions.txt", captions.join(""))
    }

    // Add strategy document
    const strategyText = `Feed Strategy

Feed Story:
${feed.feed_story || 'N/A'}

Visual Rhythm:
${feed.visual_rhythm || 'N/A'}

Layout Type:
${feed.layout_type || 'N/A'}

Posts:
${feedPosts.map(p => `Post ${p.position}: ${p.post_type || 'N/A'} - ${p.content_pillar || 'N/A'}`).join('\n')}
`
    zip.file("strategy.txt", strategyText)

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: "blob" })

    // Return ZIP file
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="instagram-feed-${feedId}.zip"`,
      },
    })
  } catch (error) {
    console.error("[v0] [DOWNLOAD-BUNDLE] Error:", error)
    return NextResponse.json(
      { error: "Failed to create download bundle" },
      { status: 500 }
    )
  }
}

