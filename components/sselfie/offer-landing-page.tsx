import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PublicFooter, PublicNav } from "@/components/sselfie/public-marketing"
import { PublicOfferTracker } from "@/components/analytics/public-offer-tracker"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

export type OfferLandingPageProps = {
  eyebrow: string
  title: string
  problem: string
  promise: string
  productId: "what_to_say" | "show_up" | "get_paid"
  offerSlug: string
  ctaKeyword: "SAY" | "CONTENT" | "PAID"
  price: string
  checkoutHref: string
  outcomes: string[]
  steps: Array<{ title: string; body: string }>
  bestFor: string[]
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
  })
  return `${href}?${params.toString()}`
}

export function OfferLandingPage(props: OfferLandingPageProps) {
  const checkoutHref = checkoutWithAttribution(props.checkoutHref, props.offerSlug, props.ctaKeyword)

  return (
    <>
      <PublicOfferTracker
        offerSlug={props.offerSlug}
        productId={props.productId}
        ctaKeyword={props.ctaKeyword}
      />
      <PublicNav loginHref="/auth/login" />
      <main className={`${inter.className} min-h-screen pt-[58px]`} style={{ background: C.cream, color: C.ink }}>
        <section className="px-6 py-14 md:px-20 md:py-20" style={{ background: C.ink, color: C.cream }}>
          <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: C.stone, fontWeight: 600 }}>
            {props.eyebrow}
          </p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.45fr)] lg:items-end">
            <div>
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
            </div>
            <div className="border p-6" style={{ borderColor: C.lineDark }}>
              <p className={`${cormorant.className}`} style={{ fontSize: 42, fontWeight: 300 }}>
                {props.price}
              </p>
              <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: "rgba(244,240,230,0.72)" }}>
                {props.promise}
              </p>
              <Link
                href={checkoutHref}
                className="mt-6 inline-flex w-full items-center justify-center px-6 py-3 text-[10px] uppercase tracking-[0.22em]"
                style={{ background: C.cream, color: C.ink, fontWeight: 600 }}
              >
                Start with {props.ctaKeyword}
              </Link>
              <p className="mt-4 text-[10px] uppercase tracking-[0.26em]" style={{ color: C.stone }}>
                CTA keyword: {props.ctaKeyword}
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
            <ul className="mt-8 space-y-3">
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
