import { FreebieGuideContent } from "@/components/freebie/freebie-guide-content"
import { neon } from "@neondatabase/serverless"
import Link from "next/link"

const sql = neon(process.env.DATABASE_URL!)

export default async function FreebieGuideAccessPage({
  params,
}: {
  params: { token: string }
}) {
  console.log("[v0] Checking access token:", params.token)

  const subscriber = await sql`
    SELECT id, name, email, guide_opened
    FROM freebie_subscribers
    WHERE access_token = ${params.token}
    LIMIT 1
  `

  if (subscriber.length === 0) {
    console.log("[v0] Token not found:", params.token)
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="font-serif text-4xl font-light text-stone-900 mb-4">Invalid Access Link</h1>
          <p className="text-stone-600 mb-8 leading-relaxed">
            This link is invalid or has expired. Please request a new copy of the guide.
          </p>
          <Link
            href="/freebie/selfie-guide"
            className="inline-block bg-stone-950 text-stone-50 px-8 py-3 rounded-lg uppercase tracking-wider text-sm font-light hover:bg-stone-800 transition-colors"
          >
            Get Your Guide
          </Link>
        </div>
      </div>
    )
  }

  console.log("[v0] Valid token, subscriber:", subscriber[0].email)

  // Track guide opened
  if (!subscriber[0].guide_opened) {
    console.log("[v0] Marking guide as opened")
    await sql`
      UPDATE freebie_subscribers
      SET guide_opened = TRUE, guide_opened_at = NOW()
      WHERE id = ${subscriber[0].id}
    `
  }

  return <FreebieGuideContent subscriberName={subscriber[0].name} />
}
