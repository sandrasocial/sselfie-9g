import Link from "next/link"
import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PublicFooter, PublicNav } from "@/components/sselfie/public-marketing"
import {
  PublicOfferTracker,
  trackOfferCtaClick,
  trackPostKeywordAttributed,
} from "@/components/analytics/public-offer-tracker"
import { QuizResultServedTracker } from "@/components/analytics/quiz-result-served-tracker"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

const RESULTS = {
  message: {
    title: "Start with the Masterclass.",
    body: "Your first step is message clarity. The Masterclass builds your full Selfie Branding foundation — what to say, what to show, and how to make it land.",
    href: "/masterclass",
    cta: "Open The Masterclass",
    keyword: "SAY",
    offerSlug: "masterclass",
  },
  consistency: {
    title: "Start with the Starter Kit.",
    body: "Your first step is a simple weekly rhythm. The Starter Kit gives you the photo basics, presets, and a 7-day content starter so you can actually post.",
    href: "/starter-kit",
    cta: "Get The Starter Kit",
    keyword: "CONTENT",
    offerSlug: "starter-kit",
  },
  sales: {
    title: "Start with the Masterclass.",
    body: "Your first step is a clear buyer path. The Masterclass connects your message, content, and offer so people know what to do next.",
    href: "/masterclass",
    cta: "Open The Masterclass",
    keyword: "PAID",
    offerSlug: "masterclass",
  },
  suite: {
    title: "Start with the Visibility To Paid Suite.",
    body: "You do not need one isolated fix. You need the message, content rhythm, and sales path in order.",
    href: "/visibility-suite",
    cta: "Open The Suite",
    keyword: "SUITE",
    offerSlug: "visibility-suite",
  },
  studio: {
    title: "Start with Studio.",
    body: "You want help executing every week. Studio is where Maya helps you plan, create, caption, and keep moving.",
    href: "/join/studio",
    cta: "See Studio",
    keyword: "STUDIO",
    offerSlug: "studio",
  },
  private: {
    title: "Apply for Private Sprint.",
    body: "You want Sandra's eyes on the full path. Start with the application so the next step is human and specific.",
    href: "/work-with-me",
    cta: "Apply For Private Sprint",
    keyword: "BRAND",
    offerSlug: "private-sprint",
  },
} as const

type ResultKey = keyof typeof RESULTS

export default async function QuizResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>
}) {
  const params = await searchParams
  const key = (params.result && params.result in RESULTS ? params.result : "message") as ResultKey
  const result = RESULTS[key]

  return (
    <>
      <PublicOfferTracker
        offerSlug={result.offerSlug}
        ctaKeyword={result.keyword}
        source="post_to_paid_quiz"
      />
      <QuizResultServedTracker quizSlug="post-to-paid" result={key} offerSlug={result.offerSlug} />
      <PublicNav loginHref="/auth/login" />
      <main className={`${inter.className} min-h-screen pt-[58px]`} style={{ background: "#F4F0E6", color: "#0F0D0B" }}>
        <section className="grid min-h-[calc(100vh-58px)] lg:grid-cols-[minmax(0,0.68fr)_minmax(0,0.62fr)]">
          <div className="relative min-h-[340px] overflow-hidden lg:min-h-[calc(100vh-58px)]">
            <Image
              src="/academy/visibility-suite/hero.png"
              alt="Visibility planning workspace"
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-14 md:px-12 lg:px-16">
            <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: "#7A6F63", fontWeight: 600 }}>
              Your result
            </p>
            <h1 className={`${cormorant.className} mt-5 uppercase`} style={{ fontSize: "clamp(38px, 7vw, 76px)", fontWeight: 300, lineHeight: 1 }}>
              {result.title}
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-[1.75]" style={{ color: "#3D3830" }}>
              {result.body}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={`${result.href}${result.href.includes("?") ? "&" : "?"}source=quiz_result&quiz_result=${key}&cta_keyword=${result.keyword}`}
                onClick={() => {
                  const href = `${result.href}${result.href.includes("?") ? "&" : "?"}source=quiz_result&quiz_result=${key}&cta_keyword=${result.keyword}`
                  trackOfferCtaClick({
                    offerSlug: result.offerSlug,
                    ctaKeyword: result.keyword,
                    source: "post_to_paid_quiz",
                    href,
                  })
                  trackPostKeywordAttributed({
                    offerSlug: result.offerSlug,
                    ctaKeyword: result.keyword,
                    source: "post_to_paid_quiz",
                    href,
                  })
                }}
                className="inline-flex px-8 py-3 text-[10px] uppercase tracking-[0.22em]"
                style={{ background: "#0F0D0B", color: "#F4F0E6", fontWeight: 600 }}
              >
                {result.cta}
              </Link>
              <Link
                href="/visibility-suite"
                className="inline-flex border px-8 py-3 text-[10px] uppercase tracking-[0.22em]"
                style={{ borderColor: "rgba(15,13,11,0.14)", color: "#0F0D0B", fontWeight: 600 }}
              >
                Compare Full Suite
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
