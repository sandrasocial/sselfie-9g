import type { Metadata } from "next"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import type { ReactNode } from "react"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
  display: "swap",
})

const vipApplyHref =
  "/apply/brand-engine?offerType=vip&utm_source=vip_page&utm_medium=landing&utm_campaign=brand-engine-feb-2026"
const cohortApplyHref =
  "/apply/brand-engine?offerType=cohort&utm_source=vip_page&utm_medium=landing&utm_campaign=brand-engine-feb-2026"
const discoveryCallHref =
  "https://calendly.com/sandrasocial/vip-discovery-call-30-min?utm_source=vip_page&utm_medium=landing&utm_campaign=brand-engine-feb-2026"

export const metadata: Metadata = {
  title: "Brand Engine VIP | SSELFIE",
  description: "Brand Engine VIP: 6 weeks, 2 spots, just you and Sandra.",
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className={`${inter.className} text-[11px] uppercase tracking-[0.5em] text-[#8a8780]`}
      style={{ fontWeight: 500 }}
    >
      {children}
    </p>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className={`${cormorant.className} text-[42px] sm:text-[54px] leading-[1.05] uppercase text-[#f0ede8]`}
      style={{ fontWeight: 300 }}
    >
      {children}
    </h2>
  )
}

export default function BrandEngineVipPage() {
  return (
    <main className={`${inter.className} min-h-screen bg-[#0d0c0b] text-[#f0ede8]`}>
      <div className="w-full px-12 lg:px-16 py-12">
        <header className="flex items-center justify-between">
          <Link href="/" className={`${cormorant.className} text-[26px] uppercase tracking-[0.12em] text-[#f0ede8]`} style={{ fontWeight: 300 }}>
            SSELFIE
          </Link>
          <Link href="/brand-engine" className="text-[11px] uppercase tracking-[0.35em] text-[#8a8780]">
            Cohort
          </Link>
        </header>
      </div>

      <section className="px-12 lg:px-16 pb-16">
        <div className="max-w-[820px] lg:ml-[8vw]">
          <SectionLabel>6 WEEKS · 2 SPOTS ONLY · STARTS MARCH 16</SectionLabel>
          <h1
            className={`${cormorant.className} mt-4 text-[60px] sm:text-[88px] lg:text-[118px] leading-[0.9] uppercase text-[#f0ede8]`}
            style={{ fontWeight: 300 }}
          >
            BRAND ENGINE VIP
          </h1>
          <p className="mt-8 text-[18px] leading-[1.8] text-[#f0ede8]">Just you and Sandra. Your entire brand built together.</p>
          <div className="mt-10">
            <Link
              href={vipApplyHref}
              className="inline-flex bg-[#c8c4bb] text-[#0d0c0b] px-8 py-4 text-[12px] uppercase tracking-[0.35em] hover:opacity-90 transition-opacity"
            >
              Apply for VIP
            </Link>
          </div>
        </div>
      </section>

      <section className="px-12 lg:px-16 py-16 bg-[#1c1b19]">
        <div className="max-w-[760px] lg:ml-[14vw]">
          <SectionLabel>What this is</SectionLabel>
          <SectionHeading>THIS IS NOT A COURSE</SectionHeading>
          <div className="mt-8 text-[16px] sm:text-[18px] leading-[1.8] text-[#f0ede8] space-y-4">
            <p>Brand Engine VIP is 6 weeks, just you and me.</p>
            <p>
              We build your entire personal brand using AI —
              your Brand DNA, your own AI director, your offer and funnel,
              your content system. Everything.
            </p>
            <p>Done together, not handed to you. I&apos;m beside you the whole way.</p>
            <p>
              Between our weekly calls you have direct access to me
              on Telegram or WhatsApp — ask me anything, whenever you need.
            </p>
          </div>
        </div>
      </section>

      <section className="px-12 lg:px-16 py-20">
        <div className="max-w-[980px] lg:ml-[6vw]">
          <SectionLabel>The 6 weeks</SectionLabel>
          <SectionHeading>WHAT WE BUILD TOGETHER</SectionHeading>
          <div className="mt-10 border-t border-[rgba(195,190,182,0.25)]">
            {[
              {
                week: "Week 1",
                title: "Brand DNA",
                body: "Your story, voice, message, values, design system. Everything rooted in your authenticity.",
              },
              {
                week: "Week 2",
                title: "Your Control Centre",
                body: "Website or landing page. Tools connected. Everything in one place.",
              },
              {
                week: "Week 3",
                title: "Your AI Director",
                body: "An agent trained on your brand. Thinks like you. Talks like you. Available 24/7.",
              },
              {
                week: "Week 4",
                title: "Your Offer + Funnel",
                body: "Three-tier offer structure. Landing pages. Email sequences. Automations live.",
              },
              {
                week: "Week 5",
                title: "Your Content System",
                body: "SSELFIE at advanced level. 30 days of content batched and ready.",
              },
              {
                week: "Week 6",
                title: "Your Full AI Team",
                body: "A brand team that runs your brand while you live your life.",
              },
            ].map((item) => (
              <div key={item.week} className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-4 md:gap-8 py-8 border-b border-[rgba(195,190,182,0.25)]">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#8a8780]" style={{ fontWeight: 500 }}>
                  {item.week}
                </p>
                <div>
                  <h3 className={`${cormorant.className} text-[32px] sm:text-[38px] leading-[1.1] uppercase text-[#f0ede8]`} style={{ fontWeight: 300 }}>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[16px] leading-[1.8] text-[#f0ede8]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-12 lg:px-16 py-16 bg-[#1c1b19]">
        <div className="max-w-[860px] lg:ml-[12vw]">
          <SectionLabel>What you walk away with</SectionLabel>
          <SectionHeading>YOU LEAVE WITH ALL OF THIS</SectionHeading>
          <div className="mt-10 space-y-4 text-[16px] sm:text-[18px] leading-[1.8]">
            <p>— Complete Brand DNA document</p>
            <p>— Working website or landing page</p>
            <p>— Personal AI director trained on your brand</p>
            <p>— Connected automation system</p>
            <p>— Three-tier offer structure built</p>
            <p>— Working sales funnel with email sequences</p>
            <p>— 30-day content calendar ready to post</p>
            <p>— SSELFIE AI brand photos for all content</p>
            <p>— Full AI team running your brand</p>
          </div>
        </div>
      </section>

      <section className="px-12 lg:px-16 py-20">
        <div className="max-w-[760px] lg:ml-[7vw]">
          <SectionLabel>The investment</SectionLabel>
          <SectionHeading>THE INVESTMENT</SectionHeading>
          <p className={`${cormorant.className} mt-8 text-[74px] sm:text-[90px] leading-[0.95]`} style={{ fontWeight: 300 }}>
            €4,997
          </p>
          <p className="mt-3 text-[20px] leading-[1.8] text-[#8a8780]">Or 3 x €1,749</p>
          <p className="mt-8 text-[16px] sm:text-[18px] leading-[1.8] text-[#f0ede8]">
            Includes SSELFIE app membership for the full 6 weeks.
            Small API running costs on top — typically €10–50/month.
            Sandra guides you through keeping these minimal.
          </p>
        </div>
      </section>

      <section className="px-12 lg:px-16 py-16 bg-[#1c1b19]">
        <div className="max-w-[700px] lg:ml-[15vw]">
          <SectionLabel>Scarcity</SectionLabel>
          <SectionHeading>2 SPOTS. THAT&apos;S IT.</SectionHeading>
          <p className="mt-8 text-[16px] sm:text-[18px] leading-[1.8] text-[#f0ede8]">
            This is not a marketing tactic.
            I genuinely only have capacity for 2 women at this level.
            When they&apos;re filled, that&apos;s it until the next cohort.
          </p>
        </div>
      </section>

      <section className="px-12 lg:px-16 py-24">
        <div className="max-w-[760px] lg:ml-[8vw]">
          <SectionLabel>Final step</SectionLabel>
          <h2 className={`${cormorant.className} mt-4 text-[72px] sm:text-[96px] leading-[0.9] uppercase`} style={{ fontWeight: 300 }}>
            READY?
          </h2>
          <p className="mt-8 text-[16px] sm:text-[18px] leading-[1.8] text-[#f0ede8]">
            First step is a 30-minute call.
            No pitch. Just a conversation to make sure it&apos;s the right fit.
          </p>
          <div className="mt-10">
            <a
              href={discoveryCallHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex bg-[#c8c4bb] text-[#0d0c0b] px-8 py-4 text-[12px] uppercase tracking-[0.35em] hover:opacity-90 transition-opacity"
            >
              Book Your Discovery Call
            </a>
          </div>
          <div className="mt-6">
            <Link href={cohortApplyHref} className="text-[12px] uppercase tracking-[0.25em] text-[#8a8780] hover:text-[#f0ede8]">
              Prefer the group cohort? Apply here →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
