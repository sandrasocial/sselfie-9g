import { neon } from "@neondatabase/serverless"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import PromptGuidePageClient from "@/components/prompt-guides/prompt-guide-page-client"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PromptGuidePage({ params }: PageProps) {
  const { slug } = await params

  // Fetch prompt page data
  const [page] = await sql`
    SELECT pp.*, pg.title as guide_title, pg.category
    FROM prompt_pages pp
    JOIN prompt_guides pg ON pp.guide_id = pg.id
    WHERE pp.slug = ${slug}
    AND pp.status = 'published'
  `

  if (!page) {
    notFound()
  }

  // Fetch approved items
  const items = await sql`
    SELECT * FROM prompt_guide_items
    WHERE guide_id = ${page.guide_id}
    AND status = 'approved'
    ORDER BY sort_order ASC, created_at ASC
  `

  // Track page view
  await sql`
    UPDATE prompt_pages
    SET view_count = view_count + 1
    WHERE id = ${page.id}
  `

  // Check for access token cookie
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  return (
    <PromptGuidePageClient
      page={page}
      items={items}
      hasAccessToken={!!accessToken}
      emailListTag={page.email_list_tag}
    />
  )
}
