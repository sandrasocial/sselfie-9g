import { notFound } from "next/navigation"

import { generateSuiteProofSprintEmail } from "@/lib/email/templates/suite-proof-sprint"
import {
  SUITE_PROOF_REQUIREMENTS,
  SUITE_PROOF_SPRINT,
} from "@/lib/email/campaigns/suite-proof-sprint-plan"
import {
  SUITE_PROOF_REEL_DRAFT,
  SUITE_PROOF_STORY_DRAFT,
} from "@/lib/email/campaigns/suite-proof-sprint-content"

export const dynamic = "force-dynamic"

export default function SuiteProofSprintReviewPage() {
  if (process.env.NODE_ENV === "production") notFound()

  const email = generateSuiteProofSprintEmail({ firstName: "Lovely" })

  return (
    <main className="min-h-screen bg-brand-pearl px-5 py-10 text-brand-obsidian md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-smoke">
          Proof sprint · local review only
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-normal leading-none md:text-6xl">
          One transformation before another funnel rebuild.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-dark md:text-base">
          Nothing on this page sends or publishes. The campaign stays blocked until Sandra adds and
          approves the real proof.
        </p>

        <section className="mt-10 grid gap-px bg-brand-whisper md:grid-cols-4">
          {[
            [String(SUITE_PROOF_SPRINT.maxAudience), "maximum test audience"],
            [`${SUITE_PROOF_SPRINT.cooldownHours}h`, "marketing cooldown"],
            [`€${SUITE_PROOF_SPRINT.annualPriceEur}`, "existing annual price"],
            [`${SUITE_PROOF_SPRINT.successGate.annualSales} sales`, "unlock gate"],
          ].map(([value, label]) => (
            <div key={label} className="bg-white px-5 py-5">
              <strong className="block font-serif text-2xl font-normal">{value}</strong>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-smoke">
                {label}
              </span>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-serif text-3xl">The proof gate</h2>
            <ol className="mt-5 space-y-4 border-y border-brand-whisper py-5 text-sm leading-6 text-stone-dark">
              {SUITE_PROOF_REQUIREMENTS.map((requirement, index) => (
                <li key={requirement} className="grid grid-cols-[28px_1fr] gap-3">
                  <span className="text-brand-smoke">0{index + 1}</span>
                  <span>{requirement}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-l-2 border-brand-obsidian bg-white px-5 py-4 text-sm leading-6">
              Status: {email.status}. Even after proof is added, Sandra approves the exact email,
              Reel and Stories before anything goes out.
            </p>
          </div>

          <div className="overflow-x-auto bg-brand-whisper p-3 md:p-8">
            <iframe
              title="Suite proof sprint email preview"
              srcDoc={email.html}
              className="mx-auto block min-h-[1220px] w-[390px] max-w-full border-0 bg-white shadow-xl"
            />
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <article className="bg-white p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-smoke">
              Reel draft
            </p>
            <h2 className="mt-3 font-serif text-3xl">{SUITE_PROOF_REEL_DRAFT.firstFrame}</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-stone-dark">
              {SUITE_PROOF_REEL_DRAFT.spoken.map(line => <p key={line}>{line}</p>)}
            </div>
            <p className="mt-6 border-t border-brand-whisper pt-5 text-sm leading-6">
              CTA: {SUITE_PROOF_REEL_DRAFT.cta}
            </p>
          </article>

          <article className="bg-white p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-smoke">
              Story sequence
            </p>
            <div className="mt-5 space-y-4">
              {SUITE_PROOF_STORY_DRAFT.map((frame, index) => (
                <div key={frame} className="border-b border-brand-whisper pb-4 text-sm leading-6 last:border-0">
                  <span className="mr-3 text-brand-smoke">{index + 1}</span>{frame}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
