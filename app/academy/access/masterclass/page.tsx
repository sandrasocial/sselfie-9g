import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
})

const C = {
  ink: "#0F0D0B",
  cream: "#EDE9E2",
  creamWarm: "#F4F0E6",
  stone: "#C4B5A0",
  onCream: "#0F0D0B",
  onCreamSub: "#3D3830",
  muted: "#7A6F63",
  div: "rgba(15,13,11,0.10)",
  divStrong: "rgba(15,13,11,0.18)",
}

const LP_CREAM =
  "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09)"

const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"

type MasterclassCourse = {
  id: number
  product_id: string
  title: string
  description: string | null
  total_lessons: number
}

type ResourceCard = {
  eyebrow: string
  title: string
  detail: string
  href: string
  thumbnail?: string
  module: "Module 1" | "Module 2" | "Module 3" | "Bonus" | "Presets"
}

const courseOrder = ["branded_by_sselfie", "editing_masterclass"]

const bonusResources: ResourceCard[] = [
  {
    eyebrow: "Bonus workbook",
    module: "Bonus",
    title: "Selfie To CEO Instagram Planner",
    detail: "Plan your posts, CTA, offer focus, and weekly content rhythm.",
    href: `${BLOB}/academy/masterclass/bonuses/selfie-to-ceo-instagram-planner.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/bonuses/thumbnails/selfie-to-ceo-instagram-planner-cover.png`,
  },
  {
    eyebrow: "Bonus captions",
    module: "Bonus",
    title: "30 Day Caption Pack",
    detail: "Use when you need caption starters without staring at a blank page.",
    href: `${BLOB}/academy/masterclass/bonuses/selfie-to-ceo-goal-setting-30-day-caption-pack.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/bonuses/thumbnails/selfie-to-ceo-goal-setting-30-day-caption-pack-cover.png`,
  },
  {
    eyebrow: "Bonus checklist",
    module: "Bonus",
    title: "The Visibility Checklist",
    detail: "A simple visibility check when you want to know what to fix next.",
    href: `${BLOB}/academy/masterclass/bonuses/the-visibility-checklist.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/bonuses/thumbnails/the-visibility-checklist-cover.png`,
  },
  {
    eyebrow: "Bonus prompts",
    module: "Bonus",
    title: "ChatGPT Prompts",
    detail: "Prompt support for turning your brand work into clearer content.",
    href: `${BLOB}/academy/masterclass/bonuses/chatgpt-prompts.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/bonuses/thumbnails/chatgpt-prompts-cover.png`,
  },
  {
    eyebrow: "Mobile presets",
    module: "Presets",
    title: "DNG Preset Collection",
    detail: "Fifteen Lightroom Mobile presets across Light & Dreamy, Nordic Deep Urban, and Dark & Moody.",
    href: `${BLOB}/academy/starter-kit/presets/starter-kit-dng-presets.zip`,
  },
  {
    eyebrow: "Preset setup",
    module: "Presets",
    title: "Preset Setup Guide",
    detail: "Step-by-step PDF for importing and saving the DNG presets in Lightroom Mobile.",
    href: `${BLOB}/academy/starter-kit/presets/ssa-step-by-step-guide-presets.pdf`,
  },
]

const moduleResources: ResourceCard[] = [
  {
    eyebrow: "Confidence",
    module: "Module 1",
    title: "Your CEO Era Starts Now",
    detail: "Start here when you need the confidence reset before posting.",
    href: `${BLOB}/academy/masterclass/module-one/your-ceo-era-starts-now-worksheet.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-one/thumbnails/your-ceo-era-starts-now-worksheet-cover.png`,
  },
  {
    eyebrow: "Confidence",
    module: "Module 1",
    title: "Confidence Activation Journal",
    detail: "Track your daily showing-up proof and build momentum.",
    href: `${BLOB}/academy/masterclass/module-one/confidence-activation-journal.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-one/thumbnails/confidence-activation-journal-cover.png`,
  },
  {
    eyebrow: "Confidence",
    module: "Module 1",
    title: "CEO Energy Affirmation Sheet",
    detail: "Use before your Power Selfie or anytime your energy dips.",
    href: `${BLOB}/academy/masterclass/module-one/ceo-energy-affirmation-sheet.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-one/thumbnails/ceo-energy-affirmation-sheet-cover.png`,
  },
  {
    eyebrow: "Brand clarity",
    module: "Module 2",
    title: "CEO Brand Blueprint",
    detail: "Clarify who you help, what you stand for, and what you want to be known for.",
    href: `${BLOB}/academy/masterclass/module-two/ceo-brand-blueprint.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-two/thumbnails/ceo-brand-blueprint-cover.png`,
  },
  {
    eyebrow: "Brand clarity",
    module: "Module 2",
    title: "Brand Glow Blueprint",
    detail: "Choose the visual direction, fonts, colors, and vibe that match your energy.",
    href: `${BLOB}/academy/masterclass/module-two/brand-glow-blueprint.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-two/thumbnails/brand-glow-blueprint-cover.png`,
  },
  {
    eyebrow: "Content",
    module: "Module 3",
    title: "CEO Content Confidence System",
    detail: "Build your growth, connection, and conversion posting rhythm.",
    href: `${BLOB}/academy/masterclass/module-three/ceo-content-confidence-system.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-three/thumbnails/ceo-content-confidence-system-cover.png`,
  },
  {
    eyebrow: "Content",
    module: "Module 3",
    title: "CEO Reels Launchpad",
    detail: "Film short, real clips that make Reels easier to create.",
    href: `${BLOB}/academy/masterclass/module-three/ceo-reels-launchpad.pdf`,
    thumbnail: `${BLOB}/academy/masterclass/module-three/thumbnails/ceo-reels-launchpad-cover.png`,
  },
]

async function getMasterclassCourses(): Promise<MasterclassCourse[]> {
  const rows = await sql`
    SELECT id, product_id, title, description, total_lessons
    FROM academy_courses
    WHERE product_id IN ('branded_by_sselfie', 'editing_masterclass')
      AND status = 'published'
    ORDER BY id
  `

  return (rows as MasterclassCourse[]).sort(
    (a, b) => courseOrder.indexOf(a.product_id) - courseOrder.indexOf(b.product_id)
  )
}

function getCourseLabel(productId: string) {
  return productId === "editing_masterclass" ? "Editing Masterclass" : "Core Masterclass"
}

function getCourseCta(productId: string) {
  return productId === "editing_masterclass" ? "Open Editing Course" : "Start Branded by SSELFIE"
}

function ResourceGrid({ resources }: { resources: ResourceCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <a
          key={`${resource.title}-${resource.href}`}
          href={resource.href}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden transition-opacity hover:opacity-95"
          style={{ background: C.creamWarm, border: `1px solid ${C.divStrong}`, color: C.onCream }}
        >
          {resource.thumbnail ? (
            <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 5", background: C.cream }}>
              <Image
                src={resource.thumbnail}
                alt={`${resource.title} cover`}
                fill
                sizes="(min-width: 1280px) 28vw, (min-width: 768px) 45vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center px-6 text-center" style={{ aspectRatio: "4 / 5", background: C.ink, color: C.creamWarm }}>
              <span className={`${cormorant.className} text-[36px] uppercase leading-none`}>
                {resource.module}
              </span>
            </div>
          )}
          <div className="p-5">
            <p className={`${inter.className} text-[9px] uppercase tracking-[0.34em]`} style={{ color: C.muted, fontWeight: 600 }}>
              {resource.module} / {resource.eyebrow}
            </p>
            <h3 className={`${cormorant.className} mt-3 uppercase`} style={{ fontSize: "clamp(22px, 3vw, 31px)", fontWeight: 300, lineHeight: 1.02, textShadow: LP_CREAM }}>
              {resource.title}
            </h3>
            <p className={`${inter.className} mt-4 text-[13px] leading-[1.62]`} style={{ color: C.onCreamSub, fontWeight: 400 }}>
              {resource.detail}
            </p>
            <span className={`${inter.className} mt-5 inline-flex text-[10px] uppercase tracking-[0.28em]`} style={{ color: C.ink, fontWeight: 600 }}>
              Open download
            </span>
          </div>
        </a>
      ))}
    </div>
  )
}

export default async function MasterclassAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/masterclass")
  const [entitlementState, courses] = await Promise.all([
    getAcademyEntitlementState(neonUser.id),
    getMasterclassCourses(),
  ])

  const accessibleIds = new Set(entitlementState.accessibleProductIds)
  const explicitIds = new Set(entitlementState.explicitProductIds)
  const hasMasterclassAccess =
    entitlementState.membershipActive ||
    explicitIds.has("masterclass") ||
    accessibleIds.has("masterclass") ||
    accessibleIds.has("branded_by_sselfie") ||
    accessibleIds.has("editing_masterclass")

  if (!hasMasterclassAccess) {
    redirect("/masterclass")
  }

  await logAnalyticsEvent({
    eventName: "masterclass_access_opened",
    userId: neonUser.id,
    path: "/academy/access/masterclass",
    properties: {
      source: "masterclass_buyer_home",
      course_count: courses.length,
      has_brand_strategy_access: accessibleIds.has("brand_strategy_pack"),
    },
  })

  return (
    <main className={`${inter.className} min-h-screen`} style={{ background: C.cream, color: C.onCream }}>
      <section className="px-6 py-14 md:px-20 md:py-20" style={{ borderBottom: `1px solid ${C.div}` }}>
        <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
          Masterclass Access
        </p>
        <h1 className={`${cormorant.className} mt-6 uppercase`} style={{ fontWeight: 300, fontSize: "clamp(40px, 8vw, 82px)", lineHeight: 0.98, letterSpacing: "-0.02em", textShadow: LP_CREAM }}>
          Your CEO brand library.
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-[1.78]" style={{ color: C.onCreamSub, fontWeight: 400 }}>
          Start with the course path. Keep the downloads close. Use the bonus library when you are ready to plan, post, and repeat.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="#course-path" className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]" style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}>
            Start Here
          </Link>
          <Link href="#bonus-library" className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]" style={{ border: `1px solid ${C.divStrong}`, color: C.ink, fontWeight: 600 }}>
            Bonus Library
          </Link>
        </div>
      </section>

      <section className="space-y-12 px-6 py-12 md:px-20 md:py-16">
        <section id="course-path" className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <article className="p-8 md:p-10" style={{ background: C.creamWarm, border: `1px solid ${C.divStrong}` }}>
            <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
              Start Here
            </p>
            <h2 className={`${cormorant.className} mt-5 uppercase`} style={{ fontWeight: 300, fontSize: "clamp(30px, 5vw, 54px)", lineHeight: 1.04, textShadow: LP_CREAM }}>
              Move through the method.
            </h2>
            <p className="mt-5 max-w-2xl text-[14px] leading-[1.76]" style={{ color: C.onCreamSub, fontWeight: 400 }}>
              Branded by SSELFIE gives you confidence, clarity, and content. The Editing Masterclass helps your photos and videos look clean before you post.
            </p>
          </article>

          <aside className="p-8" style={{ border: `1px solid ${C.divStrong}` }}>
            <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
              Suggested order
            </p>
            <ol className="mt-5 space-y-4">
              {["Brand Strategy Pack", "Branded by SSELFIE", "Editing Masterclass", "Bonus Library"].map((item, index) => (
                <li key={item} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3">
                  <span className={`${cormorant.className}`} style={{ color: C.stone, fontSize: 30, lineHeight: 1 }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] uppercase tracking-[0.18em]" style={{ color: C.onCream, fontWeight: 600 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/academy/access/brand-strategy" className="p-7 transition-opacity hover:opacity-90" style={{ background: C.ink, color: C.creamWarm }}>
            <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone, fontWeight: 600 }}>
              Strategy
            </p>
            <h2 className={`${cormorant.className} mt-5 uppercase`} style={{ fontSize: "clamp(25px, 4vw, 38px)", fontWeight: 300, lineHeight: 1.04 }}>
              Brand Strategy Pack
            </h2>
            <p className="mt-4 text-[13px] leading-[1.7]" style={{ color: "rgba(244,240,230,0.76)" }}>
              Clarify the offer and message before you post harder.
            </p>
            <span className="mt-6 inline-flex text-[10px] uppercase tracking-[0.28em]" style={{ fontWeight: 600 }}>
              Start strategy
            </span>
          </Link>

          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/academy/courses/${course.id}`}
              className="p-7 transition-opacity hover:opacity-90"
              style={{ background: C.creamWarm, border: `1px solid ${C.divStrong}`, color: C.onCream }}
            >
              <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
                {getCourseLabel(course.product_id)}
              </p>
              <h2 className={`${cormorant.className} mt-5 uppercase`} style={{ fontSize: "clamp(25px, 4vw, 38px)", fontWeight: 300, lineHeight: 1.04, textShadow: LP_CREAM }}>
                {course.title}
              </h2>
              <p className="mt-4 text-[13px] leading-[1.7]" style={{ color: C.onCreamSub, fontWeight: 400 }}>
                {course.description}
              </p>
              <span className="mt-6 inline-flex text-[10px] uppercase tracking-[0.28em]" style={{ fontWeight: 600 }}>
                {getCourseCta(course.product_id)}
              </span>
            </Link>
          ))}
        </section>

        <section id="bonus-library" className="space-y-8 p-8 md:p-10" style={{ background: C.ink, color: C.creamWarm }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone, fontWeight: 600 }}>
                Bonus Library
              </p>
              <h2 className={`${cormorant.className} mt-5 uppercase`} style={{ fontWeight: 300, fontSize: "clamp(32px, 5vw, 58px)", lineHeight: 1.02 }}>
                Everything in one place.
              </h2>
            </div>
            <p className="max-w-md text-[14px] leading-[1.72]" style={{ color: "rgba(244,240,230,0.74)", fontWeight: 400 }}>
              Open the planners, prompts, visibility tools, and presets from here. The same files also stay attached to their lessons.
            </p>
          </div>
          <ResourceGrid resources={bonusResources} />
        </section>

        <section className="space-y-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
              Module Downloads
            </p>
            <h2 className={`${cormorant.className} mt-5 uppercase`} style={{ fontWeight: 300, fontSize: "clamp(30px, 5vw, 54px)", lineHeight: 1.04, textShadow: LP_CREAM }}>
              Workbooks by lesson.
            </h2>
          </div>
          <ResourceGrid resources={moduleResources} />
        </section>
      </section>
    </main>
  )
}
