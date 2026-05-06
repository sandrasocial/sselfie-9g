import Link from "next/link"
import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PublicFooter, PublicNav } from "@/components/sselfie/public-marketing"
import { PublicOfferTracker } from "@/components/analytics/public-offer-tracker"
import type { VisibilityMiniProductId } from "@/lib/visibility-products"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

export type OfferLandingPageProps = {
  eyebrow: string
  title: string
  problem: string
  promise: string
  productId: VisibilityMiniProductId
  offerSlug: string
  ctaKeyword: "SAY" | "CONTENT" | "PAID" | "PHOTOS"
  price: string
  checkoutHref: string
  checkoutEnabled?: boolean
  ctaLabel?: string
  fallbackHref?: string
  outcomes: string[]
  proof: string[]
  steps: Array<{ title: string; body: string }>
  bestFor: string[]
  heroImage: string
  heroImageAlt: string
  supportImage: string
  supportImageAlt: string
  nextStep: {
    title: string
    body: string
    href: string
    label: string
  }
}

const C = {
  ink: "#0F0D0B",
  cream: "#F4F0E6",
  paper: "#EDE9E2",
  stone: "#A79B8B",
  line: "rgba(15,13,11,0.12)",
  lineDark: "rgba(244,240,230,0.16)",
}

function checkoutWithAttribution(href: string, offerSlug: string, keyword: string) {
  const params = new URLSearchParams({
    offer_slug: offerSlug,
    source: "offer_landing",
    cta_keyword: keyword,
    entry_path: `/${offerSlug}`,
    buyer_stage: "micro",
  })
  return `${href}?${params.toString()}`
}

export function OfferLandingPage(props: OfferLandingPageProps) {
  const checkoutHref = props.checkoutEnabled === false && props.fallbackHref
    ? props.fallbackHref
    : checkoutWithAttribution(props.checkoutHref, props.offerSlug, props.ctaKeyword)
  const ctaLabel = props.ctaLabel || `Start with ${props.ctaKeyword}`

  return (
    <>
      <PublicOfferTracker
        offerSlug={props.offerSlug}
        productId={props.productId}
        ctaKeyword={props.ctaKeyword}
      />
      <PublicNav loginHref="/auth/login" />
      <main className={`${inter.className} min-h-screen pt-[58px]`} style={{ background: C.cream, color: C.ink }}>
        <section className="grid min-h-[calc(100svh-58px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,0.78fr)]" style={{ background: C.ink, color: C.cream }}>
          <div className="flex flex-col justify-center px-6 py-14 md:px-20 md:py-20">
            <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: C.stone, fontWeight: 600 }}>
              {props.eyebrow}
            </p>
            <div className="mt-6">
              <h1
                className={`${cormorant.className} uppercase`}
                style={{
                  fontWeight: 300,
                  fontSize: "clamp(40px, 8vw, 82px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.01em",
                }}
              >
                {props.title}
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-[1.75]" style={{ color: "rgba(244,240,230,0.78)" }}>
                {props.problem}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={checkoutHref}
                  className="inline-flex min-h-12 items-center justify-center px-7 py-3 text-[10px] uppercase tracking-[0.22em]"
                  style={{ background: C.cream, color: C.ink, fontWeight: 600 }}
                >
                  {ctaLabel}
                </Link>
                <p className={`${cormorant.className}`} style={{ fontSize: 34, fontWeight: 300 }}>
                  {props.price}
                </p>
              </div>
              <p className="mt-4 max-w-md text-[12px] leading-[1.7]" style={{ color: "rgba(244,240,230,0.62)" }}>
                {props.promise}
              </p>
            </div>
          </div>
          <div className="relative min-h-[420px] overflow-hidden lg:min-h-[calc(100svh-58px)]">
            <Image
              src={props.heroImage}
              alt={props.heroImageAlt}
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(15,13,11,0.05), rgba(15,13,11,0.34))" }} />
            <div className="absolute bottom-6 left-6 right-6 border px-5 py-4 backdrop-blur-sm md:bottom-8 md:left-8 md:right-8" style={{ borderColor: "rgba(244,240,230,0.20)", background: "rgba(15,13,11,0.42)" }}>
              <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.stone, fontWeight: 600 }}>
                Focused product
              </p>
              <p className="mt-2 text-[13px] leading-[1.65]" style={{ color: "rgba(244,240,230,0.78)" }}>
                One workspace. One first action. No full Studio dashboard unless you choose Studio.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-20 md:py-16" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: "#7A6F63", fontWeight: 600 }}>
                You leave with
              </p>
              <h2 className={`${cormorant.className} mt-4 uppercase`} style={{ fontSize: "clamp(30px, 5vw, 54px)", fontWeight: 300, lineHeight: 1 }}>
                One clear next step.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {props.outcomes.map(outcome => (
                <div key={outcome} className="p-5" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                  <p className="text-[14px] leading-[1.65]">{outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]" style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}>
          <div className="relative min-h-[360px] overflow-hidden">
            <Image
              src={props.supportImage}
              alt={props.supportImageAlt}
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="px-6 py-12 md:px-20 md:py-16">
            <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: "#7A6F63", fontWeight: 600 }}>
              What changes after this
            </p>
            <h2 className={`${cormorant.className} mt-4 uppercase`} style={{ fontSize: "clamp(30px, 5vw, 54px)", fontWeight: 300, lineHeight: 1 }}>
              The first win is smaller on purpose.
            </h2>
            <div className="mt-8 grid gap-4">
              {props.proof.map(item => (
                <p key={item} className="border-b pb-4 text-[15px] leading-[1.7]" style={{ borderColor: C.line, color: "#3D3830" }}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-20 md:py-16" style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}>
          <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: "#7A6F63", fontWeight: 600 }}>
            How it works
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {props.steps.map((step, index) => (
              <article key={step.title} className="p-6" style={{ background: C.cream, border: `1px solid ${C.line}` }}>
                <span className={`${cormorant.className}`} style={{ color: C.stone, fontSize: 42, fontWeight: 300 }}>
                  0{index + 1}
                </span>
                <h3 className={`${cormorant.className} mt-4 uppercase`} style={{ fontSize: 25, fontWeight: 300 }}>
                  {step.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: "#3D3830" }}>
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-2">
          <div className="px-6 py-12 md:px-20 md:py-16">
            <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: "#7A6F63", fontWeight: 600 }}>
              Best for you if
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {props.bestFor.map(item => (
                <li key={item} className="text-[15px] leading-[1.7]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-12 md:px-20 md:py-16" style={{ background: C.ink, color: C.cream }}>
            <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: C.stone, fontWeight: 600 }}>
              Next step
            </p>
            <h2 className={`${cormorant.className} mt-4 uppercase`} style={{ fontSize: "clamp(30px, 5vw, 54px)", fontWeight: 300, lineHeight: 1 }}>
              {props.nextStep.title}
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-[1.75]" style={{ color: "rgba(244,240,230,0.78)" }}>
              {props.nextStep.body}
            </p>
            <Link
              href={props.nextStep.href}
              className="mt-7 inline-flex px-7 py-3 text-[10px] uppercase tracking-[0.22em]"
              style={{ background: C.cream, color: C.ink, fontWeight: 600 }}
            >
              {props.nextStep.label}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
