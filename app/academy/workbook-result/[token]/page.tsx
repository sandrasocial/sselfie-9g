import Link from "next/link"
import { notFound } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { PrintPlanButton } from "@/components/academy/print-plan-button"
import {
  normalizeGetPaidSalesPlan,
  normalizeShowUpContentPlan,
  type GetPaidSalesPlan,
  type ShowUpContentPlan,
  type WorkbookCover,
} from "@/lib/academy/follow-up-workbook-output"
import { sql } from "@/lib/db/client"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const dynamic = "force-dynamic"
export const revalidate = 0
export const metadata = {
  title: "Your Personal Workbook Plan | SSELFIE",
  robots: { index: false, follow: false },
}

type PageProps = {
  params: Promise<{ token: string }>
}

type WorkbookOutputRow = {
  product_id: string
  output_json: unknown
  source_answers: unknown
  created_at: string | Date | null
}

async function getOutput(token: string): Promise<WorkbookOutputRow | null> {
  try {
    const rows = await sql`
      SELECT product_id, output_json, source_answers, created_at
      FROM academy_workbook_outputs
      WHERE access_token = ${token}::uuid
        AND product_id IN ('show_up', 'get_paid')
      LIMIT 1
    `
    return (rows[0] as WorkbookOutputRow | undefined) || null
  } catch (error) {
    console.error("[workbook-result] Failed to load output:", error)
    return null
  }
}

function formatDate(value: string | Date | null) {
  const date = value ? new Date(value) : new Date()
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function answerCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function ResultHeader({ backHref, label }: { backHref: string; label: string }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-brand-obsidian/10 bg-white/92 px-5 py-5 backdrop-blur md:px-12 print:static">
      <Link
        href={backHref}
        className={`${cormorant.className} text-sm uppercase tracking-[0.32em] text-brand-obsidian no-underline`}
      >
        SSELFIE
      </Link>
      <PrintPlanButton />
      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-stone sm:block">
        {label}
      </span>
    </header>
  )
}

function ResultCover({
  cover,
  createdAt,
  inputs,
  eyebrow,
}: {
  cover: WorkbookCover
  createdAt: string | Date | null
  inputs: number
  eyebrow: string
}) {
  return (
    <section className="result-section cover-section border-b border-brand-obsidian/10 bg-brand-pearl px-6 py-20 md:px-16 md:py-28">
      <div className="mx-auto max-w-5xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">{eyebrow}</p>
        <h1
          className={`${cormorant.className} mt-8 max-w-5xl text-[clamp(56px,11vw,124px)] uppercase leading-[0.82] tracking-[-0.03em]`}
        >
          {cover.title}
        </h1>
        <p
          className={`${cormorant.className} mt-8 max-w-3xl text-3xl leading-tight text-stone-dark`}
        >
          {cover.subtitle}
        </p>
        <div className="mt-14 grid max-w-3xl gap-px border border-brand-obsidian/12 bg-brand-obsidian/12 sm:grid-cols-3">
          {[
            ["Created For", cover.createdFor || "Friend"],
            ["Created", formatDate(createdAt)],
            ["Built From", `${inputs || "Your"} Workbook Answers`],
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">
                {label}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeading({
  number,
  label,
  title,
}: {
  number: string
  label: string
  title: string
}) {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
        {number} / {label}
      </p>
      <h2
        className={`${cormorant.className} mt-6 max-w-4xl text-5xl uppercase leading-none md:text-7xl`}
      >
        {title}
      </h2>
    </>
  )
}

function List({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  if (!items.length) return null
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-stone-dark">
          <span className="shrink-0 text-stone-soft">
            {numbered ? String(index + 1).padStart(2, "0") : "-"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Footer({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <footer className="bg-brand-obsidian px-6 py-12 text-center text-brand-pearl print:hidden">
      <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-white/45">SSELFIE</p>
      <p
        className={`${cormorant.className} mx-auto mt-5 max-w-2xl text-4xl uppercase leading-none`}
      >
        {title}
      </p>
      <Link
        href={href}
        className="mt-8 inline-flex bg-brand-pearl px-8 py-[13px] text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-obsidian no-underline"
      >
        {label}
      </Link>
    </footer>
  )
}

export function ShowUpResultDocument({
  plan,
  createdAt,
  inputs,
}: {
  plan: ShowUpContentPlan
  createdAt: string | Date | null
  inputs: number
}) {
  const postsByWeek = plan.weeklyThemes.map((theme, index) => ({
    theme,
    posts: plan.posts.filter(post => post.week === `Week ${index + 1}`),
  }))

  return (
    <main
      className={`workbook-result min-h-screen bg-white text-brand-obsidian ${inter.className}`}
    >
      <ResultHeader backHref="/academy/show_up" label="What To Post" />
      <ResultCover
        cover={plan.cover}
        createdAt={createdAt}
        inputs={inputs}
        eyebrow="Your Personal 30-Day Content Plan"
      />

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            number="01"
            label="Your Rhythm"
            title="A plan you can actually keep up with."
          />
          <div className="foundation-grid mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Monthly Focus", plan.foundation.monthlyFocus],
              ["Audience Action", plan.foundation.audienceAction],
              ["Realistic Capacity", plan.foundation.realisticCapacity],
              ["Best Formats", plan.foundation.bestFormats.join(", ")],
              ["Stop Forcing", plan.foundation.formatToAvoid],
              ["Make It Easier", plan.foundation.easierSystem],
            ].map(([label, value]) => (
              <article
                key={label}
                className="result-card border border-brand-obsidian/12 bg-brand-pearl p-6"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">
                  {label}
                </p>
                <p className="mt-4 text-sm leading-7 text-stone-dark">{value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section bg-brand-obsidian px-6 py-16 text-brand-pearl md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/45">
            02 / Four Weeks
          </p>
          <h2
            className={`${cormorant.className} mt-6 max-w-4xl text-5xl uppercase leading-none md:text-7xl`}
          >
            One clear focus each week.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {plan.weeklyThemes.map((theme, index) => (
              <article
                key={`${theme.week}-${index}`}
                className="result-card border border-white/15 bg-white/[0.05] p-6 md:p-8"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
                  {theme.week}
                </p>
                <h3 className={`${cormorant.className} mt-4 text-4xl uppercase leading-none`}>
                  {theme.theme}
                </h3>
                <p className="mt-5 text-sm leading-7 text-white/68">{theme.purpose}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {postsByWeek.map(({ theme, posts }, weekIndex) => (
        <section
          key={theme.week}
          className="calendar-week result-section border-b border-brand-obsidian/10 px-6 py-16 md:px-16 md:py-24"
        >
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              number={String(weekIndex + 3).padStart(2, "0")}
              label={theme.week}
              title={theme.theme}
            />
            <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-dark">{theme.purpose}</p>
            <div className="post-grid mt-10 grid gap-4 md:grid-cols-2">
              {posts.map((post, index) => (
                <article
                  key={`${post.day}-${index}`}
                  className="post-card result-card border border-brand-obsidian/12 bg-brand-pearl p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-stone">
                      {post.day}
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-soft">
                      {post.type} / {post.goal}
                    </p>
                  </div>
                  <h3 className={`${cormorant.className} mt-4 text-2xl leading-tight`}>
                    {post.hook}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-stone-dark">{post.captionStarter}</p>
                  <div className="mt-4 grid gap-3 border-t border-brand-obsidian/10 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-stone">
                        Visual
                      </p>
                      <p className="mt-2 text-xs leading-5 text-stone-dark">{post.visual}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-stone">
                        CTA
                      </p>
                      <p className="mt-2 text-xs leading-5 text-stone-dark">{post.cta}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="result-section bg-brand-pearl px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading number="07" label="Your System" title="Use what you already have." />
          <div className="system-grid mt-10 grid gap-5 lg:grid-cols-3">
            {[
              ["Existing Assets", plan.existingAssetIdeas],
              ["Repurpose This", plan.repurposingIdeas],
              ["Sunday Batch Plan", plan.sundayBatchPlan],
            ].map(([label, items]) => (
              <article
                key={label as string}
                className="result-card border border-brand-obsidian/12 bg-white p-6"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
                  {label as string}
                </p>
                <List items={items as string[]} />
              </article>
            ))}
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <article className="result-card border border-brand-obsidian/12 bg-white p-6 md:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
                Carry Into Get Paid
              </p>
              <p className={`${cormorant.className} mt-4 text-3xl leading-tight`}>
                {plan.getPaidInput}
              </p>
            </article>
            <article className="result-card border border-brand-obsidian/12 bg-white p-6 md:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
                Do This Now
              </p>
              <List items={plan.nextSteps} numbered />
            </article>
          </div>
        </div>
      </section>

      <Footer
        href="/academy/products/get_paid"
        label="Continue To Get Paid"
        title="Your next 30 days are ready."
      />
      <PrintStyles />
    </main>
  )
}

export function GetPaidResultDocument({
  plan,
  createdAt,
  inputs,
}: {
  plan: GetPaidSalesPlan
  createdAt: string | Date | null
  inputs: number
}) {
  return (
    <main
      className={`workbook-result min-h-screen bg-white text-brand-obsidian ${inter.className}`}
    >
      <ResultHeader backHref="/academy/get_paid" label="Get Paid" />
      <ResultCover
        cover={plan.cover}
        createdAt={createdAt}
        inputs={inputs}
        eyebrow="Your Personal Offer And First-Sales Plan"
      />

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading number="01" label="Your Offer" title="Make the next step clear." />
          <article className="result-card mt-10 border border-brand-obsidian/12 bg-brand-pearl p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
              {plan.offer.name}
            </p>
            <p className={`${cormorant.className} mt-5 text-4xl leading-tight md:text-5xl`}>
              {plan.offer.oneSentence}
            </p>
          </article>
          <div className="offer-grid mt-5 grid gap-5 md:grid-cols-3">
            {[
              ["Exact Result", plan.offer.exactResult],
              ["Timeline", plan.offer.timeline],
              ["Price", plan.offer.price],
            ].map(([label, value]) => (
              <article key={label} className="result-card border border-brand-obsidian/12 p-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">
                  {label}
                </p>
                <p className="mt-4 text-sm leading-7 text-stone-dark">{value}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <article className="result-card border border-brand-obsidian/12 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
                What They Get
              </p>
              <List items={plan.offer.deliverables} />
            </article>
            <article className="result-card border border-brand-obsidian/12 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
                How To Buy
              </p>
              <p className={`${cormorant.className} mt-4 text-3xl leading-tight`}>
                {plan.offer.howToBuy}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="result-section bg-brand-obsidian px-6 py-16 text-brand-pearl md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/45">
            02 / Your Buyer
          </p>
          <h2
            className={`${cormorant.className} mt-6 max-w-4xl text-5xl uppercase leading-none md:text-7xl`}
          >
            Sell to one real person.
          </h2>
          <p className={`${cormorant.className} mt-10 max-w-4xl text-4xl leading-tight`}>
            {plan.buyer.oneSentence}
          </p>
          <div className="buyer-grid mt-10 grid gap-5 md:grid-cols-2">
            {[
              ["Her Struggle", plan.buyer.struggle],
              ["What She Wants", plan.buyer.desiredChange],
              ["Why Now", plan.buyer.urgency],
              ["Willingness To Pay", plan.buyer.willingnessToPay],
            ].map(([label, value]) => (
              <article
                key={label}
                className="result-card border border-white/15 bg-white/[0.05] p-6"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
                  {label}
                </p>
                <p className="mt-4 text-sm leading-7 text-white/68">{value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="first-500-section result-section bg-brand-obsidian px-6 py-16 text-brand-pearl md:px-16 md:py-24">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/45">
            03 / Your First 500 Path
          </p>
          <h2
            className={`${cormorant.className} mt-6 max-w-4xl text-5xl uppercase leading-none md:text-7xl`}
          >
            Start with a number you can explain.
          </h2>
          <article className="result-card mt-10 border border-white/15 bg-white/[0.05] p-6 md:p-10">
            <p className={`${cormorant.className} text-4xl leading-tight md:text-5xl`}>
              {plan.first500Path.path}
            </p>
            <p className="mt-8 text-sm leading-7 text-white/68">{plan.first500Path.simpleMath}</p>
            <p className="mt-5 border-t border-white/15 pt-5 text-sm font-medium leading-7 text-white">
              First move: {plan.first500Path.firstMove}
            </p>
          </article>
        </div>
      </section>

      <section className="result-section bg-brand-pearl px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading number="04" label="Your Sales Post" title="The finished words to post." />
          <article className="result-card mt-10 border border-brand-obsidian/12 bg-white p-6 md:p-10">
            {[
              ["Hook", plan.salesPost.hook],
              ["Story", plan.salesPost.story],
              ["Bridge", plan.salesPost.bridge],
              ["Offer", plan.salesPost.offer],
              ["CTA", plan.salesPost.cta],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={index ? "mt-7 border-t border-brand-obsidian/10 pt-7" : ""}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">
                  {label}
                </p>
                <p
                  className={`${label === "Hook" ? cormorant.className : ""} mt-4 whitespace-pre-line ${label === "Hook" ? "text-3xl leading-tight" : "text-sm leading-7 text-stone-dark"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </article>
        </div>
      </section>

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading number="05" label="Your Conversations" title="Warm words. No pressure." />
          <div className="script-grid mt-10 grid gap-5 md:grid-cols-2">
            {[
              ["DM Scripts", plan.dmScripts],
              ["Follow Ups", plan.followUps],
            ].map(([label, items]) => (
              <article
                key={label as string}
                className="result-card border border-brand-obsidian/12 bg-brand-pearl p-6 md:p-8"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
                  {label as string}
                </p>
                <List items={items as string[]} numbered />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading number="06" label="Their Questions" title="Answer the real objections." />
          <div className="objection-grid mt-5 grid gap-5">
            {plan.objectionReplies.map((item, index) => (
              <article
                key={`${item.objection}-${index}`}
                className="result-card border border-brand-obsidian/12 p-6"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">
                  Objection {String(index + 1).padStart(2, "0")}
                </p>
                <p className={`${cormorant.className} mt-4 text-2xl leading-tight`}>
                  {item.objection}
                </p>
                <p className="mt-4 text-sm leading-7 text-stone-dark">{item.reply}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section border-y border-brand-obsidian/10 bg-brand-pearl px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            number="07"
            label="Your First Buyers"
            title="Start with the warmest people."
          />
          <article className="result-card mt-10 border border-brand-obsidian/12 bg-white p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-stone">
              First 10 Buyer Prompts
            </p>
            <List items={plan.firstTenBuyerPrompts} numbered />
          </article>
        </div>
      </section>

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading number="08" label="Your Next 7 Days" title="One sales move each day." />
          <div className="seven-day-grid mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plan.sevenDayPlan.map((day, index) => (
              <article
                key={`${day.day}-${index}`}
                className="result-card border border-brand-obsidian/12 bg-brand-pearl p-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-stone">
                  {day.day}
                </p>
                <p className="mt-4 text-sm font-medium leading-6">{day.action}</p>
                <p className="mt-3 text-xs leading-5 text-stone-dark">{day.output}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section bg-brand-obsidian px-6 py-16 text-brand-pearl md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/45">
            09 / Keep It Honest
          </p>
          <h2
            className={`${cormorant.className} mt-6 max-w-4xl text-5xl uppercase leading-none md:text-7xl`}
          >
            Clear promise. Clear boundary.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="result-card border border-white/15 bg-white/[0.05] p-6 md:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
                Delivery Boundary
              </p>
              <p className="mt-4 text-sm leading-7 text-white/68">{plan.safety.deliveryBoundary}</p>
            </article>
            <article className="result-card border border-white/15 bg-white/[0.05] p-6 md:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
                No False Promise
              </p>
              <p className="mt-4 text-sm leading-7 text-white/68">{plan.safety.nonGuarantee}</p>
            </article>
          </div>
          <article className="result-card mt-5 border border-white/15 bg-white/[0.05] p-6 md:p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
              Carry Into Your Visibility Plan
            </p>
            <p className={`${cormorant.className} mt-4 text-3xl leading-tight`}>
              {plan.visibilityPlanInput}
            </p>
          </article>
          <article className="result-card mt-5 border border-white/15 bg-brand-pearl p-6 text-brand-obsidian md:p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">
              Your Next Best Move
            </p>
            <p className={`${cormorant.className} mt-4 text-3xl leading-tight`}>
              {plan.nextBestMove}
            </p>
          </article>
        </div>
      </section>

      <Footer
        href="/academy/access/visibility-suite"
        label="Open My Visibility Path"
        title="Your first-sales plan is ready."
      />
      <PrintStyles />
    </main>
  )
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4;
          margin: 12mm;
        }

        html,
        body {
          background: white !important;
        }

        .workbook-result {
          background: white !important;
          color: var(--color-obsidian) !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .result-section {
          break-before: page;
          padding: 9mm 7mm !important;
        }

        .cover-section {
          break-before: auto;
          min-height: 250mm;
          display: flex;
          align-items: center;
        }

        .first-500-section {
          min-height: 250mm;
          display: flex;
          align-items: center;
        }

        .result-card {
          break-inside: avoid;
          padding: 5mm !important;
        }

        .result-section h2 {
          font-size: 32pt !important;
          line-height: 0.94 !important;
          margin-top: 5mm !important;
        }

        .result-section h3 {
          font-size: 19pt !important;
        }

        .result-section p,
        .result-section li {
          line-height: 1.45 !important;
        }

        .result-section .grid {
          gap: 4mm !important;
        }

        .calendar-week .post-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .post-card {
          padding: 3.5mm !important;
        }

        .post-card h3 {
          font-size: 14pt !important;
        }

        .post-card p {
          font-size: 8pt !important;
        }

        .foundation-grid,
        .offer-grid,
        .buyer-grid,
        .system-grid,
        .seven-day-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .script-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .objection-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
      }
    `}</style>
  )
}

export default async function WorkbookResultPage({ params }: PageProps) {
  const { token } = await params
  const row = await getOutput(token)
  if (!row) notFound()

  const shared = {
    createdAt: row.created_at,
    inputs: answerCount(row.source_answers),
  }

  if (row.product_id === "show_up") {
    return <ShowUpResultDocument plan={normalizeShowUpContentPlan(row.output_json)} {...shared} />
  }

  if (row.product_id === "get_paid") {
    return <GetPaidResultDocument plan={normalizeGetPaidSalesPlan(row.output_json)} {...shared} />
  }

  notFound()
}
