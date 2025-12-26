import { neon } from "@neondatabase/serverless"
import Link from "next/link"
import Image from "next/image"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

interface Guide {
  page_id: number
  slug: string
  page_title: string
  guide_title: string
  description: string | null
  category: string | null
  preview_image: string | null
  published_at: Date | null
}

export default async function PromptGuidesIndexPage() {
  let guides: Guide[] = []

  try {
    const result = await sql`
      SELECT 
        pp.id as page_id,
        pp.slug,
        pp.title as page_title,
        pg.title as guide_title,
        pg.description,
        pg.category,
        pg.published_at,
        (
          SELECT image_url 
          FROM prompt_guide_items pgi
          WHERE pgi.guide_id = pg.id 
          AND pgi.status = 'approved'
          AND pgi.image_url IS NOT NULL
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
          LIMIT 1
        ) as preview_image
      FROM prompt_pages pp
      JOIN prompt_guides pg ON pp.guide_id = pg.id
      WHERE pp.status = 'published'
      ORDER BY pg.published_at DESC NULLS LAST, pp.created_at DESC
    `
    guides = result as Guide[]
  } catch (error) {
    console.error("[PromptGuides] Error fetching guides:", error)
  }

  const latestGuide = guides.length > 0 ? guides[0] : null

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-stone-50 border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-4 text-center">
            Free Prompt Guides
          </h1>
          <p className="text-center text-stone-600 font-light text-lg max-w-2xl mx-auto">
            Curated prompt collections to inspire your next photoshoot. All guides are completely free.
          </p>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        {guides.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-500 font-light">No guides available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {guides.map((guide, index) => (
              <Link
                key={guide.page_id}
                href={`/prompt-guides/${guide.slug}`}
                className="group"
              >
                <div className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  {/* Preview Image */}
                  <div className="relative aspect-[2/3] overflow-hidden bg-stone-100">
                    {guide.preview_image ? (
                      <Image
                        src={guide.preview_image}
                        alt={guide.page_title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-stone-400 text-sm font-light">No preview</span>
                      </div>
                    )}
                    {index === 0 && latestGuide && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-stone-950 text-white text-xs font-light tracking-[0.2em] uppercase px-3 py-1 rounded-full">
                          Latest
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className="font-serif text-xl md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3 group-hover:text-stone-700 transition-colors">
                      {guide.page_title}
                    </h2>
                    {guide.description && (
                      <p className="text-sm text-stone-600 font-light leading-relaxed mb-4 flex-1">
                        {guide.description}
                      </p>
                    )}
                    {guide.category && (
                      <div className="mt-auto">
                        <span className="text-xs text-stone-500 font-light uppercase tracking-wider">
                          {guide.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




