import Link from "next/link"
import { notFound } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { PrintPlanButton } from "@/components/academy/print-plan-button"
import {
  normalizeWhatToSayMessageKit,
  type WhatToSayMessageKit,
} from "@/lib/academy/what-to-say-output"
import { sql } from "@/lib/db/client"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const dynamic = "force-dynamic"
export const revalidate = 0
export const metadata = {
  title: "Your What To Say Message Kit | SSELFIE",
  robots: { index: false, follow: false },
}

type PageProps = {
  params: Promise<{ token: string }>
}

type WorkbookOutputRow = {
  output_json: unknown
  source_answers: unknown
  created_at: string | Date | null
}

async function getOutput(token: string): Promise<WorkbookOutputRow | null> {
  try {
    const rows = await sql`
      SELECT output_json, source_answers, created_at
      FROM academy_workbook_outputs
      WHERE access_token = ${token}::uuid
        AND product_id = 'what_to_say'
      LIMIT 1
    `
    return (rows[0] as WorkbookOutputRow | undefined) || null
  } catch (error) {
    console.error("[what-to-say-result] Failed to load output:", error)
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

function FoundationCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (!value) return null
  return (
    <article className="result-card border border-brand-obsidian/12 bg-white p-6 md:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone">{label}</p>
      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-dark">{value}</p>
    </article>
  )
}

function MessageBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="result-card border border-brand-obsidian/12 bg-brand-pearl p-6 md:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone">{label}</p>
      <p className={`${cormorant.className} mt-4 text-3xl leading-tight text-brand-obsidian`}>
        {value}
      </p>
    </div>
  )
}

function SafeList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-stone-dark">
          <span className="text-stone-soft">{String(index + 1).padStart(2, "0")}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function WhatToSayResultDocument({
  kit,
  createdAt,
  inputs,
}: {
  kit: WhatToSayMessageKit
  createdAt: string | Date | null
  inputs: number
}) {
  const createdFor = kit.cover.createdFor || "Friend"

  const foundation = [
    ["Your Person", kit.foundation.audience],
    ["What She Says To Herself", kit.foundation.audienceSelfTalk],
    ["The Change You Help Create", kit.foundation.transformation],
    ["Why You", kit.foundation.authority],
    ["Your Story", kit.foundation.story],
    ["Your Expertise", kit.foundation.expertise],
    ["Your Values", kit.foundation.values],
    ["Your Vision", kit.foundation.vision],
    ["Your Voice", kit.foundation.voice],
  ] as const

  return (
    <main className={`what-to-say-result min-h-screen bg-white text-brand-obsidian ${inter.className}`}>
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-brand-obsidian/10 bg-white/92 px-5 py-5 backdrop-blur md:px-12 print:static">
        <Link
          href="/academy/what_to_say"
          className={`${cormorant.className} text-sm uppercase tracking-[0.32em] text-brand-obsidian no-underline`}
        >
          SSELFIE
        </Link>
        <PrintPlanButton />
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-stone sm:block">
          What To Say
        </span>
      </header>

      <section className="result-section cover-section border-b border-brand-obsidian/10 bg-brand-pearl px-6 py-20 md:px-16 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
            Your Personal Message Kit
          </p>
          <h1
            className={`${cormorant.className} mt-8 max-w-4xl text-[clamp(56px,11vw,124px)] uppercase leading-[0.82] tracking-[-0.03em]`}
          >
            What To Say
          </h1>
          <p className={`${cormorant.className} mt-8 max-w-3xl text-3xl leading-tight text-stone-dark`}>
            {kit.cover.subtitle}
          </p>
          <div className="mt-14 grid max-w-3xl gap-px border border-brand-obsidian/12 bg-brand-obsidian/12 sm:grid-cols-3">
            {[
              ["Created For", createdFor],
              ["Created", formatDate(createdAt)],
              ["Built From", `${inputs || "Your"} Workbook Answers`],
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">{label}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
            01 / Your Core Message
          </p>
          <h2 className={`${cormorant.className} mt-6 max-w-3xl text-5xl uppercase leading-none md:text-7xl`}>
            The words you can start using now.
          </h2>
          <div className="mt-10 grid gap-5">
            <MessageBlock label="One Line Message" value={kit.coreMessage.oneLineMessage} />
            <div className="grid gap-5 md:grid-cols-2">
              <MessageBlock label="I Help Statement" value={kit.coreMessage.iHelpStatement} />
              <MessageBlock label="Instagram Bio" value={kit.coreMessage.instagramBio} />
            </div>
          </div>
        </div>
      </section>

      <section className="result-section border-y border-brand-obsidian/10 bg-brand-pearl px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
            02 / Your Foundation
          </p>
          <h2 className={`${cormorant.className} mt-6 max-w-3xl text-5xl uppercase leading-none md:text-7xl`}>
            Your answers, rewritten clearly.
          </h2>
          <div className="foundation-grid mt-10 grid gap-5 md:grid-cols-2">
            {foundation.map(([label, value]) => (
              <FoundationCard key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      </section>

      <section className="result-section bg-brand-obsidian px-6 py-16 text-brand-pearl md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/45">
            03 / Your Content Buckets
          </p>
          <h2 className={`${cormorant.className} mt-6 max-w-3xl text-5xl uppercase leading-none md:text-7xl`}>
            Four things you can talk about.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {kit.contentBuckets.map((bucket, index) => (
              <article key={`${bucket.name}-${index}`} className="result-card border border-white/15 bg-white/[0.05] p-6 md:p-8">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/40">
                  Bucket {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className={`${cormorant.className} mt-4 text-4xl uppercase leading-none`}>
                  {bucket.name}
                </h3>
                <p className="mt-5 text-sm leading-7 text-white/68">{bucket.purpose}</p>
                <ul className="mt-6 space-y-3">
                  {bucket.postIdeas.map((idea, ideaIndex) => (
                    <li key={`${idea}-${ideaIndex}`} className="flex gap-3 text-sm leading-6 text-white/68">
                      <span className="text-white/35">-</span>
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
              04 / Your Words
            </p>
            <h2 className={`${cormorant.className} mt-6 text-5xl uppercase leading-none md:text-7xl`}>
              Sound like you.
            </h2>
            <div className="mt-8 flex flex-wrap gap-2">
              {kit.brandWords.map((word, index) => (
                <span key={`${word}-${index}`} className="border border-brand-obsidian/12 bg-brand-pearl px-4 py-3 text-xs leading-5">
                  {word}
                </span>
              ))}
            </div>
          </div>
          <div className="result-card border border-brand-obsidian/12 p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone">
              10 Hooks Written For You
            </p>
            <SafeList items={kit.hooks} />
          </div>
        </div>
      </section>

      <section className="result-section border-y border-brand-obsidian/10 bg-brand-pearl px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
            05 / Ready To Post
          </p>
          <h2 className={`${cormorant.className} mt-6 max-w-3xl text-5xl uppercase leading-none md:text-7xl`}>
            Three finished captions.
          </h2>
          <div className="captions-grid mt-10 grid gap-5">
            {kit.captions.map((caption, index) => (
              <article key={`${caption.label}-${index}`} className="caption-card result-card border border-brand-obsidian/12 bg-white p-6 md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone">
                  {caption.label}
                </p>
                <h3 className={`${cormorant.className} mt-5 text-3xl leading-tight md:text-4xl`}>
                  {caption.hook}
                </h3>
                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-stone-dark">{caption.body}</p>
                <div className="mt-6 border-t border-brand-obsidian/10 pt-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone">CTA</p>
                  <p className="mt-3 text-sm leading-6">{caption.cta}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="result-section px-6 py-16 md:px-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-stone">
            06 / The Next Step
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <MessageBlock label="Your Soft CTA" value={kit.softCta} />
            <MessageBlock label="Content To Offer Bridge" value={kit.offerBridge} />
          </div>
          <div className="result-card mt-5 border border-brand-obsidian/12 p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone">
              Do This Now
            </p>
            <SafeList items={kit.nextSteps} />
          </div>
        </div>
      </section>

      <footer className="bg-brand-obsidian px-6 py-12 text-center text-brand-pearl print:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-white/45">SSELFIE</p>
        <p className={`${cormorant.className} mx-auto mt-5 max-w-2xl text-4xl uppercase leading-none`}>
          Your words are ready. Start with one post.
        </p>
        <Link
          href="/academy/products/show_up"
          className="mt-8 inline-flex bg-brand-pearl px-8 py-[13px] text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-obsidian no-underline"
        >
          Continue To Show Up
        </Link>
      </footer>

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

          .what-to-say-result {
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
            font-size: 22pt !important;
          }

          .result-section p,
          .result-section li {
            line-height: 1.5 !important;
          }

          .result-section .grid {
            gap: 4mm !important;
          }

          .foundation-grid,
          .captions-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .caption-card h3 {
            font-size: 18pt !important;
          }

          .caption-card p {
            font-size: 9pt !important;
          }
        }
      `}</style>
    </main>
  )
}

export default async function WhatToSayResultPage({ params }: PageProps) {
  const { token } = await params
  const row = await getOutput(token)
  if (!row) notFound()

  return (
    <WhatToSayResultDocument
      kit={normalizeWhatToSayMessageKit(row.output_json)}
      createdAt={row.created_at}
      inputs={answerCount(row.source_answers)}
    />
  )
}
