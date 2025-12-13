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

async function testVimeoEmbeds() {
  console.log("\n🧪 TESTING VIMEO EMBED URL GENERATION\n")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  try {
    // Get a few sample lessons
    const lessons = await sql`
      SELECT 
        id,
        title,
        video_url
      FROM academy_lessons
      WHERE lesson_type = 'video' 
      AND video_url IS NOT NULL
      AND video_url != 'PLACEHOLDER_VIDEO_URL'
      LIMIT 5
    `

    console.log(`Testing ${lessons.length} sample lessons:\n`)

    for (const lesson of lessons) {
      const originalUrl = lesson.video_url
      const vimeoId = getVimeoVideoId(originalUrl)
      
      if (!vimeoId) {
        console.log(`❌ Lesson ${lesson.id}: "${lesson.title}"`)
        console.log(`   Could not extract Vimeo ID from: ${originalUrl}\n`)
        continue
      }

      // Generate embed URL (same as video player does)
      const embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0&responsive=1&dnt=1`
      
      console.log(`✅ Lesson ${lesson.id}: "${lesson.title.substring(0, 50)}..."`)
      console.log(`   Original URL: ${originalUrl}`)
      console.log(`   Extracted Vimeo ID: ${vimeoId}`)
      console.log(`   Generated Embed URL: ${embedUrl}`)
      console.log(`   Test in browser: https://vimeo.com/${vimeoId}`)
      console.log("")
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🔍 DIAGNOSIS")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    console.log("If videos are not playing, check:")
    console.log("")
    console.log("1. Vimeo Video Privacy Settings:")
    console.log("   - Go to Vimeo → Your Videos → Select a video")
    console.log("   - Settings → Privacy")
    console.log("   - Under 'Where can this be embedded?':")
    console.log("     ✓ Must be 'Anywhere' or 'Specific domains'")
    console.log("     ✗ If set to 'Nowhere', videos won't play")
    console.log("")
    console.log("2. Video Player Code:")
    console.log("   - Check browser console for errors")
    console.log("   - Look for CORS or iframe errors")
    console.log("   - Verify iframe is loading (check Network tab)")
    console.log("")
    console.log("3. Test Embed URL Directly:")
    console.log("   - Copy one of the embed URLs above")
    console.log("   - Paste in browser address bar")
    console.log("   - If it loads, the issue is in the player code")
    console.log("   - If it doesn't load, the video doesn't allow embedding")
    console.log("")
    console.log("4. Check Vimeo Account Settings:")
    console.log("   - Vimeo → Settings → Privacy")
    console.log("   - Default embed settings might be blocking")
    console.log("")

  } catch (error) {
    console.error("❌ Error testing Vimeo embeds:", error)
    process.exit(1)
  }
}

testVimeoEmbeds()
  .then(() => {
    console.log("✅ Test complete\n")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  })

