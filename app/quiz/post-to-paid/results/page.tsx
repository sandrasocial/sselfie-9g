import Link from "next/link"
import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PublicFooter, PublicNav } from "@/components/sselfie/public-marketing"
import { PublicOfferTracker } from "@/components/analytics/public-offer-tracker"
import { QuizResultServedTracker } from "@/components/analytics/quiz-result-served-tracker"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

const RESULTS = {
  message: {
    title: "Start with What To Say.",
    body: "Your first paid next step is message clarity. Make the offer easier to understand before you ask content to sell it.",
    href: "/what-to-say",
    cta: "Open What To Say",
    keyword: "SAY",
    offerSlug: "what-to-say",
  },
  consistency: {
    title: "Start with Show Up.",
    body: "Your first paid next step is a weekly rhythm. You need content that repeats the right message without draining you.",
    href: "/show-up",
    cta: "Open Show Up",
    keyword: "CONTENT",
    offerSlug: "show-up",
  },
  sales: {
    title: "Start with Get Paid.",
    body: "Your first paid next step is the buyer path. Connect one post, one keyword, one landing page, and one offer.",
    href: "/get-paid",
    cta: "Open Get Paid",
    keyword: "PAID",
    offerSlug: "get-paid",
  },
  suite: {
    title: "Start with the Visibility To Paid Suite.",
    body: "You do not need one isolated fix. You need the message, content rhythm, sales path, and Maya plan in order.",
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
