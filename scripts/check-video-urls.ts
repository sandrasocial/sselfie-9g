import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

function getVimeoVideoId(url: string): string | null {
  if (!url) return null
  const patterns = [/vimeo\.com\/(\d+)/, /player\.vimeo\.com\/video\/(\d+)/]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

async function checkVideoUrls() {
  console.log("\n🔍 CHECKING VIDEO URLS IN DATABASE\n")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  try {
    // Get all lessons with video URLs
    const lessons = await sql`
      SELECT 
        id,
        course_id,
        title,
        lesson_type,
        video_url,
        duration_minutes,
        created_at
      FROM academy_lessons
      WHERE lesson_type = 'video'
      ORDER BY course_id, lesson_number
    `

    console.log(`Found ${lessons.length} video lessons\n`)

    if (lessons.length === 0) {
      console.log("❌ No video lessons found in database")
      return
    }

    let validVimeo = 0
    let validYouTube = 0
    let invalidUrls = 0
    let placeholderUrls = 0
    let emptyUrls = 0
    let directVideoUrls = 0

    const issues: Array<{
      lessonId: number
      title: string
      url: string
      issue: string
    }> = []

    for (const lesson of lessons) {
      const videoUrl = lesson.video_url

      if (!videoUrl || videoUrl.trim() === "") {
        emptyUrls++
        issues.push({
          lessonId: lesson.id,
          title: lesson.title,
          url: "(empty)",
          issue: "Video URL is empty",
        })
        continue
      }

      if (videoUrl === "PLACEHOLDER_VIDEO_URL" || videoUrl.includes("PLACEHOLDER")) {
        placeholderUrls++
        issues.push({
          lessonId: lesson.id,
          title: lesson.title,
          url: videoUrl,
          issue: "Placeholder URL - needs to be replaced with actual Vimeo URL",
        })
        continue
      }

      const vimeoId = getVimeoVideoId(videoUrl)
      const youtubeId = getYouTubeVideoId(videoUrl)

      if (vimeoId) {
        validVimeo++
        console.log(`✅ Lesson ${lesson.id}: "${lesson.title.substring(0, 50)}..."`)
        console.log(`   Vimeo ID: ${vimeoId}`)
        console.log(`   URL: ${videoUrl}`)
        console.log("")
      } else if (youtubeId) {
        validYouTube++
        console.log(`✅ Lesson ${lesson.id}: "${lesson.title.substring(0, 50)}..."`)
        console.log(`   YouTube ID: ${youtubeId}`)
        console.log(`   URL: ${videoUrl}`)
        console.log("")
      } else if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
        // Direct video URL (not Vimeo/YouTube)
        directVideoUrls++
        issues.push({
          lessonId: lesson.id,
          title: lesson.title,
          url: videoUrl,
          issue: "Direct video URL (not Vimeo/YouTube) - may have CORS issues",
        })
      } else {
        invalidUrls++
        issues.push({
          lessonId: lesson.id,
          title: lesson.title,
          url: videoUrl,
          issue: "Invalid URL format - not a valid Vimeo or YouTube URL",
        })
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📊 SUMMARY")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    console.log(`✅ Valid Vimeo URLs: ${validVimeo}`)
    console.log(`✅ Valid YouTube URLs: ${validYouTube}`)
    console.log(`⚠️  Direct video URLs: ${directVideoUrls}`)
    console.log(`❌ Invalid URLs: ${invalidUrls}`)
    console.log(`⚠️  Placeholder URLs: ${placeholderUrls}`)
    console.log(`❌ Empty URLs: ${emptyUrls}`)
    console.log(`\n📝 Total lessons: ${lessons.length}`)

    if (issues.length > 0) {
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("⚠️  ISSUES FOUND")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. Lesson ID ${issue.lessonId}: "${issue.title}"`)
        console.log(`   Issue: ${issue.issue}`)
        console.log(`   URL: ${issue.url}`)
        console.log("")
      })
    }

    // Check for common Vimeo URL format issues
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("💡 VIMEO URL FORMAT REQUIREMENTS")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    console.log("Valid Vimeo URL formats:")
    console.log("  ✓ https://vimeo.com/123456789")
    console.log("  ✓ https://player.vimeo.com/video/123456789")
    console.log("  ✓ vimeo.com/123456789")
    console.log("\nInvalid formats:")
    console.log("  ✗ https://vimeo.com/channels/staffpicks/123456789 (channel URLs)")
    console.log("  ✗ https://vimeo.com/groups/name/videos/123456789 (group URLs)")
    console.log("  ✗ PLACEHOLDER_VIDEO_URL")
    console.log("  ✗ (empty)")
    console.log("\n⚠️  IMPORTANT: Vimeo videos must allow embedding!")
    console.log("   Check Vimeo video settings → Privacy → Embed: 'Anywhere' or 'Specific domains'")
    console.log("")

  } catch (error) {
    console.error("❌ Error checking video URLs:", error)
    process.exit(1)
  }
}

checkVideoUrls()
  .then(() => {
    console.log("\n✅ Check complete\n")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  })

