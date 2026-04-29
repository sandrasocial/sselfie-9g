import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { sql } from "@/lib/db/client"
import { normalizeVisibilityPlan, type VisibilityPlanJson } from "@/lib/academy/visibility-plan"
import { PrintPlanButton } from "@/components/academy/print-plan-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

type PageProps = {
  params: Promise<{ token: string }>
}

type VisibilityPlanRow = {
  plan_json: unknown
  product_ids: string[] | null
  created_at: string | Date | null
}

function formatDate(value: string | Date | null | undefined) {
  const date = value ? new Date(value) : new Date()
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
    .format(date)
    .toUpperCase()
}

async function getPlan(token: string): Promise<VisibilityPlanRow | null> {
  try {
    const rows = await sql`
      SELECT plan_json, product_ids, created_at
      FROM visibility_suite_plans
      WHERE access_token = ${token}::uuid
      LIMIT 1
    `
    return (rows[0] as VisibilityPlanRow | undefined) || null
  } catch (error) {
    console.error("[visibility-plan] Failed to load plan:", error)
    return null
  }
}

function StatusPage({ title, body }: { title: string; body: string }) {
  return (
    <main className={`min-h-screen bg-[#0F0D0B] px-6 py-20 text-[#F4F0E6] ${inter.className}`}>
      <div className="mx-auto max-w-xl border border-white/12 bg-white/[0.04] p-8">
        <p className="text-[10px] uppercase tracking-[0.42em] text-white/42">SSELFIE</p>
        <h1 className={`${cormorant.className} mt-5 text-5xl uppercase leading-none`}>{title}</h1>
        <p className="mt-5 text-sm leading-7 text-white/62">{body}</p>
      </div>
    </main>
  )
}

function List({ items, tone = "light" }: { items?: string[]; tone?: "light" | "dark" }) {
  if (!items?.length) return null
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className={`flex gap-3 text-sm leading-6 ${
            tone === "dark" ? "text-white/64" : "text-[#3D3830]"
          }`}
        >
          <span className="text-[#C4B5A0]">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function VisibilityPlanPage({ params }: PageProps) {
  const { token } = await params
  const row = await getPlan(token)

  if (!row) {
    return (
      <StatusPage
        title="Plan Not Found"
        body="This Visibility Plan link does not exist or could not be loaded."
      />
    )
  }

  const plan: VisibilityPlanJson = normalizeVisibilityPlan(row.plan_json)
  const createdFor = plan.cover?.createdFor || "Friend"
  const productCount = row.product_ids?.length || 0
  const firstPosts = plan.content?.firstFivePosts?.length
    ? plan.content.firstFivePosts
    : [
        {
          day: "Day 1",
          type: "Story",
          hook: "Start with the truth.",
          caption: "Share the real moment behind why this work matters to you.",
          cta: "Ask people to reply if they relate.",
        },
      ]
  const nextDays = plan.nextSevenDays?.length
    ? plan.nextSevenDays
    : [
        {
          day: "Day 1",
          action: "Publish one honest post.",
          output: "A clear first signal to your audience.",
        },
      ]

  return (
    <main className={`visibility-plan min-h-screen bg-[#F4F0E6] text-[#0F0D0B] ${inter.className}`}>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#0F0D0B]/10 bg-[#F4F0E6]/90 px-6 py-5 backdrop-blur md:px-12 print:static">
        <a
          href="/academy/access/visibility-suite"
          className={`${cormorant.className} text-sm uppercase tracking-[0.32em] text-[#0F0D0B] no-underline`}
        >
          SSELFIE
        </a>
        <PrintPlanButton />
        <span className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#7A6F63]">
          Visibility Plan
        </span>
      </header>

      <section className="relative grid min-h-[78vh] overflow-hidden lg:grid-cols-[1fr_0.72fr] print:min-h-0">
        <div className="px-6 py-16 md:px-16 md:py-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[#7A6F63]">
            Created For
          </p>
          <h1
            className={`${cormorant.className} mt-6 text-[clamp(48px,9vw,96px)] uppercase leading-[0.92] tracking-[-0.02em]`}
          >
            {createdFor}
          </h1>
          <p className="mt-7 max-w-xl text-[16px] leading-[1.8] text-[#3D3830]">
            {plan.cover?.subtitle ||
              "Your message, content rhythm, sales path, and next 7 days in one place."}
          </p>
          <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
            <div className="border border-[#0F0D0B]/12 p-4">
              <p className="text-[9px] uppercase tracking-[0.32em] text-[#7A6F63]">Date</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">
                {formatDate(row.created_at)}
              </p>
            </div>
            <div className="border border-[#0F0D0B]/12 p-4">
              <p className="text-[9px] uppercase tracking-[0.32em] text-[#7A6F63]">Inputs</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">
                {productCount || 1} Workbooks
              </p>
            </div>
            <div className="border border-[#0F0D0B]/12 p-4">
              <p className="text-[9px] uppercase tracking-[0.32em] text-[#7A6F63]">Focus</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em]">Next 7 Days</p>
            </div>
          </div>
        </div>
        <div className="relative hidden min-h-[520px] lg:block print:hidden">
          <Image
            src="/academy/visibility-suite/hero.png"
            alt=""
            fill
            priority
            sizes="36vw"
            className="object-cover"
          />
        </div>

        {plan.message?.brandPhrases?.length ? (
          <div className="mt-10 border border-[#0F0D0B]/12 bg-[#EDE9E2] p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7A6F63]">
              Brand Phrases
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.message.brandPhrases.map((phrase, index) => (
                <span
                  key={`${phrase}-${index}`}
                  className="border border-[#0F0D0B]/12 px-3 py-2 text-xs leading-5 text-[#3D3830]"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="border-t border-[#0F0D0B]/10 px-6 py-14 md:px-16 md:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[#7A6F63]">
          01 — Message
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2
              className={`${cormorant.className} text-[clamp(34px,5vw,60px)] uppercase leading-none`}
            >
              What you are here to say.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#3D3830]">
              {plan.message?.audience || "Your audience and message direction are ready to refine."}
            </p>
          </div>
          <div className="border border-[#0F0D0B]/12 bg-[#EDE9E2] p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7A6F63]">
              Positioning
            </p>
            <p className={`${cormorant.className} mt-4 text-3xl leading-tight text-[#0F0D0B]`}>
              {plan.message?.positioning ||
                "I help my audience move from unclear to visible with a simple system."}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(plan.message?.pillars?.length
            ? plan.message.pillars
            : [
                {
                  name: "Core Message",
                  description: "Lead with the clearest promise your audience needs to hear.",
                  postIdeas: ["Tell the story", "Teach the shift", "Invite the next step"],
                },
              ]
          ).map((pillar, index) => (
            <article
              key={`${pillar.name}-${index}`}
              className="border border-[#0F0D0B]/12 bg-[#F4F0E6] p-5"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[#C4B5A0]">
                Pillar {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className={`${cormorant.className} mt-3 text-3xl uppercase leading-none`}>
                {pillar.name}
              </h3>
              <p className="mt-4 text-sm leading-6 text-[#3D3830]">{pillar.description}</p>
              <List items={pillar.postIdeas} />
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#0F0D0B] px-6 py-14 text-[#F4F0E6] md:px-16 md:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[#C4B5A0]">
          02 — Content
        </p>
        <h2
          className={`${cormorant.className} mt-6 max-w-3xl text-[clamp(34px,5vw,64px)] uppercase leading-none`}
        >
          Your first five posts.
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          {firstPosts.map((post, index) => (
            <article
              key={`${post.hook}-${index}`}
              className="border border-white/12 bg-white/[0.04] p-5"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/42">
                {post.day || `Day ${index + 1}`} / {post.type || "Post"}
              </p>
              <h3 className={`${cormorant.className} mt-4 text-2xl leading-tight text-white`}>
                {post.hook || "Start with the clearest hook."}
              </h3>
              <p className="mt-4 text-sm leading-6 text-white/64">{post.caption}</p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C4B5A0]">
                {post.cta || "Invite a reply"}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/42">
              Weekly Themes
            </p>
            <List items={plan.content?.weeklyThemes} tone="dark" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/42">
              Batching Checklist
            </p>
            <ul className="mt-4 space-y-2">
              {(plan.content?.batchingChecklist || []).map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-white/64">
                  <span className="text-[#C4B5A0]">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-16 md:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[#7A6F63]">
          03 — Sales
        </p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2
              className={`${cormorant.className} text-[clamp(34px,5vw,60px)] uppercase leading-none`}
            >
              The path to paid.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#3D3830]">
              {plan.sales?.buyerProfile ||
                "Sell to the person who already feels the problem and wants a simpler next step."}
            </p>
            <List items={plan.sales?.first500Plan} />
          </div>
          <article className="border border-[#0F0D0B]/12 bg-[#EDE9E2] p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7A6F63]">
              Offer Statement
            </p>
            <p className={`${cormorant.className} mt-4 text-3xl leading-tight`}>
              {plan.sales?.offerStatement || "A clear offer gives your visibility somewhere to go."}
            </p>
            <div className="mt-8 border-t border-[#0F0D0B]/10 pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7A6F63]">
                Sales Post
              </p>
              <p className={`${cormorant.className} mt-3 text-2xl leading-tight`}>
                {plan.sales?.salesPost?.hook}
              </p>
              <p className="mt-4 text-sm leading-7 text-[#3D3830]">{plan.sales?.salesPost?.body}</p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em]">
                {plan.sales?.salesPost?.cta}
              </p>
            </div>
          </article>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="border border-[#0F0D0B]/12 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7A6F63]">
              DM Scripts
            </p>
            <List items={plan.sales?.dmScripts} />
          </div>
          <div className="border border-[#0F0D0B]/12 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7A6F63]">
              Follow Ups
            </p>
            <List items={plan.sales?.followUps} />
          </div>
        </div>
      </section>

      <section className="border-t border-[#0F0D0B]/10 px-6 py-14 md:px-16 md:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-[#7A6F63]">
          04 — Next 7 Days
        </p>
        <div className="mt-8 grid gap-3 md:grid-cols-7">
          {nextDays.map((day, index) => (
            <article key={`${day.day}-${index}`} className="border border-[#0F0D0B]/12 p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#7A6F63]">
                {day.day || `Day ${index + 1}`}
              </p>
              <p className="mt-3 text-sm font-medium leading-6">{day.action}</p>
              <p className="mt-3 text-xs leading-5 text-[#7A6F63]">{day.output}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="bg-[#0F0D0B] px-6 py-12 text-center text-[#F4F0E6] print:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/42">
          SSELFIE Studio
        </p>
        <a
          href="/work-with-me"
          className="mt-6 inline-flex bg-[#F4F0E6] px-8 py-[13px] text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0F0D0B] no-underline"
        >
          Apply For Private Sprint
        </a>
      </footer>

      <style>{`
        @media print {
          .visibility-plan {
            background: #F4F0E6 !important;
            color: #0F0D0B !important;
          }
          section {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  )
}
