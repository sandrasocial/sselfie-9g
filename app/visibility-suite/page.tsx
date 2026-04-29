import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

export const metadata: Metadata = {
  title: "Visibility Suite | SSELFIE",
  description:
    "A simple three-part business system: know what to say, show up consistently, and turn attention into income. EUR 17 · EUR 27 · EUR 47.",
  openGraph: {
    title: "Visibility Suite — Know what to say. Show up. Get paid.",
    description:
      "Three workbooks. One visibility system. Message clarity, content consistency, and a monetization path — built for women who are already showing up.",
    url: "https://sselfie.ai/visibility-suite",
    type: "website",
    images: [{ url: "https://sselfie.ai/academy/visibility-suite/hero.png", width: 1200, height: 800 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visibility Suite — Know what to say. Show up. Get paid.",
    description:
      "Three workbooks. One visibility system. EUR 17 · EUR 27 · EUR 47.",
    images: ["https://sselfie.ai/academy/visibility-suite/hero.png"],
  },
}

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

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

const LP_CREAM = "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09)"

const PRODUCTS = [
  {
    id: "what_to_say",
    step: "01",
    label: "Message Clarity",
    title: "What to Say",
    price: "EUR 17",
    description:
      "Know what to say so people understand why they should follow, trust, and buy from you.",
    included: [
      "30 caption frameworks for everyday posting",
      "Prompt structures to keep your voice consistent",
      "Quick hooks and closing CTAs for conversion",
    ],
    image: "/academy/visibility-suite/what-to-say.png",
    href: "/academy/products/what_to_say",
  },
  {
    id: "show_up",
    step: "02",
    label: "Content Consistency",
    title: "Show Up",
    price: "EUR 27",
    description: "Know what to post this week without starting from zero every morning.",
    included: [
      "30-day posting rhythm mapped by content type",
      "Weekly batching workflow to reduce content stress",
      "Visibility-first structure for stronger reach",
    ],
    image: "/academy/visibility-suite/show-up.png",
    href: "/academy/products/show_up",
  },
  {
    id: "get_paid",
    step: "03",
    label: "Monetization Path",
    title: "Get Paid",
    price: "EUR 47",
    description: "Turn your visibility into a simple paid offer people can say yes to.",
    included: [
      "Revenue path map based on your current audience",
      "Offer and message alignment for higher intent",
      "90-day execution cadence with launch checkpoints",
    ],
    image: "/academy/visibility-suite/get-paid.png",
    href: "/academy/products/get_paid",
  },
]

export default function VisibilitySuiteLandingPage() {
  return (
    <main
      className={`${inter.className} min-h-screen`}
      style={{ background: C.creamWarm, color: C.onCream }}
    >
      {/* ─── Nav strip ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 md:px-20"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.4em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          SSELFIE
        </Link>
        <Link
          href="/auth/login"
          className="text-[11px] uppercase tracking-[0.3em] transition-opacity hover:opacity-70"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          Log In
        </Link>
      </div>

      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]"
        style={{ borderBottom: `1px solid ${C.divStrong}` }}
      >
        <div className="px-6 py-14 md:px-20 md:py-20">
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.muted, fontWeight: 600 }}
          >
            Visibility To Paid
          </p>
          <h1
            className={`${cormorant.className} mt-6 uppercase`}
            style={{
              fontWeight: 300,
              fontSize: "clamp(40px, 8vw, 82px)",
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              textShadow: LP_CREAM,
            }}
          >
            Know what to say.
            <br />
            Show up.
            <br />
            Get paid.
          </h1>
          <p
            className="mt-6 max-w-lg text-[15px] leading-[1.78]"
            style={{ color: C.onCreamSub, fontWeight: 400 }}
          >
            A simple visibility system for women who want to know what to say, what to post, and how
            to turn attention into income. Three workbooks. One path. Starting at EUR 17.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/academy/products/what_to_say"
              className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
              style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
            >
              Start With What To Say
            </Link>
            <Link
              href="/selfie-guide"
              className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-70"
              style={{ border: `1px solid ${C.divStrong}`, color: C.ink, fontWeight: 600 }}
            >
              Free Guide First
            </Link>
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 480 }}>
          <Image
            src="/academy/visibility-suite/hero.png"
            alt="Woman working at iMac"
            fill
            sizes="(min-width: 1024px) 36vw, 0vw"
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* ─── Three products ─────────────────────────────────────────────────── */}
      <section
        id="products"
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          The System
        </p>
        <p
          className="mt-3 max-w-xl text-[14px] leading-[1.72]"
          style={{ color: C.onCreamSub, fontWeight: 400 }}
        >
          Start with your message. Build a rhythm you can keep. Turn it into an offer people can
          say yes to. Each workbook works alone — but the three together are the whole path.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {PRODUCTS.map(product => (
            <article
              key={product.id}
              className="group overflow-hidden"
              style={{
                background: C.cream,
                border: `1px solid ${C.divStrong}`,
                color: C.onCream,
              }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="(min-width: 1024px) 28vw, (min-width: 768px) 45vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6 md:p-7">
                <div className="flex items-baseline gap-4">
                  <span
                    className={`${cormorant.className}`}
                    style={{ fontSize: 48, fontWeight: 300, lineHeight: 1, color: C.stone }}
                  >
                    {product.step}
                  </span>
                  <p
                    className="text-[9px] uppercase tracking-[0.4em]"
                    style={{ color: C.muted, fontWeight: 600 }}
                  >
                    {product.label}
                  </p>
                </div>
                <h2
                  className={`${cormorant.className} mt-4 uppercase`}
                  style={{
                    fontSize: "clamp(26px, 4vw, 36px)",
                    fontWeight: 300,
                    lineHeight: 1.04,
                    textShadow: LP_CREAM,
                  }}
                >
                  {product.title}
                </h2>
                <p
                  className="mt-4 text-[13px] leading-[1.7]"
                  style={{ color: C.onCreamSub, fontWeight: 400 }}
                >
                  {product.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {product.included.map(item => (
                    <li
                      key={item}
                      className="flex gap-2 text-[12px] leading-[1.6]"
                      style={{ color: C.onCreamSub, fontWeight: 400 }}
                    >
                      <span style={{ color: C.stone, flexShrink: 0 }}>—</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div
                  className="mt-6 flex items-center justify-between"
                  style={{ borderTop: `1px solid ${C.div}`, paddingTop: 20 }}
                >
                  <span
                    className={`${cormorant.className}`}
                    style={{ fontSize: 22, fontWeight: 300, color: C.onCream }}
                  >
                    {product.price}
                  </span>
                  <Link
                    href={product.href}
                    className="px-6 py-[11px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
                    style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
                  >
                    Get It
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────────────── */}
      <section
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          How It Works
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            {
              num: "1",
              title: "Buy one or all three",
              body: "Each product unlocks its own workbook inside your SSELFIE account. Start with What to Say if you're not sure — it's the foundation.",
            },
            {
              num: "2",
              title: "Work through the workbook",
              body: "Answer the questions at your own pace. Maya reads your answers and turns them into a plan you can use this week.",
            },
            {
              num: "3",
              title: "Move through the path",
              body: "Message clarity first. Then content consistency. Then monetization. Each step builds directly on the one before it.",
            },
          ].map(step => (
            <div key={step.num}>
              <span
                className={`${cormorant.className}`}
                style={{ fontSize: 40, fontWeight: 300, lineHeight: 1, color: C.stone }}
              >
                {step.num}
              </span>
              <h3
                className={`${cormorant.className} mt-3 uppercase`}
                style={{ fontSize: 22, fontWeight: 300, lineHeight: 1.1 }}
              >
                {step.title}
              </h3>
              <p
                className="mt-3 text-[13px] leading-[1.72]"
                style={{ color: C.onCreamSub, fontWeight: 400 }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Sprint upsell ──────────────────────────────────────────────────── */}
      <section
        className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]"
        style={{ borderTop: `1px solid ${C.divStrong}` }}
      >
        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 420 }}>
          <Image
            src="/academy/visibility-suite/sprint.png"
            alt="Private sprint"
            fill
            sizes="(min-width: 1024px) 36vw, 0vw"
            className="object-cover"
          />
        </div>
        <div
          className="px-6 py-14 md:px-20 md:py-20"
          style={{ background: C.ink, color: C.creamWarm }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: "rgba(244,240,230,0.45)", fontWeight: 600 }}
          >
            Your Next Move
          </p>
          <h2
            className={`${cormorant.className} mt-6 uppercase`}
            style={{
              fontWeight: 300,
              fontSize: "clamp(32px, 5vw, 58px)",
              lineHeight: 1.0,
              color: C.creamWarm,
            }}
          >
            The 4-Week
            <br />
            Private Sprint.
          </h2>
          <p
            className="mt-6 max-w-md text-[14px] leading-[1.78]"
            style={{ color: "rgba(244,240,230,0.72)", fontWeight: 400 }}
          >
            You have the message, the posting rhythm, and the offer direction. If you want to turn
            this into your first £10K path, apply for the 4-week private sprint with Sandra.
          </p>
          <Link
            href="/work-with-me"
            className="mt-8 inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80"
            style={{ background: C.creamWarm, color: C.ink, fontWeight: 600 }}
          >
            Apply For Private Sprint
          </Link>
        </div>
      </section>

      {/* ─── Footer strip ───────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-2 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-20"
        style={{ borderTop: `1px solid ${C.div}` }}
      >
        <p className="text-[11px]" style={{ color: C.muted, fontWeight: 300 }}>
          © {new Date().getFullYear()} SSELFIE
        </p>
        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="text-[11px] transition-opacity hover:opacity-70"
            style={{ color: C.muted, fontWeight: 300 }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-[11px] transition-opacity hover:opacity-70"
            style={{ color: C.muted, fontWeight: 300 }}
          >
            Terms
          </Link>
          <Link
            href="/academy"
            className="text-[11px] transition-opacity hover:opacity-70"
            style={{ color: C.muted, fontWeight: 300 }}
          >
            My Academy
          </Link>
        </div>
      </div>
    </main>
  )
}
