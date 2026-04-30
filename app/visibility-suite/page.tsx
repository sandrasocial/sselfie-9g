import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

export const metadata: Metadata = {
  title: "Visibility Suite | SSELFIE",
  description:
    "A simple visibility system for women who want to know what to say, what to post, and how to build their first clear path from content to income. Launch price €97.",
  openGraph: {
    title: "Visibility Suite — Know what to say. Show up. Get paid.",
    description:
      "Three workbooks. One visibility system. Message clarity, content consistency, and a monetization path — built for women who are already showing up.",
    url: "https://sselfie.ai/visibility-suite",
    type: "website",
    images: [{ url: "https://sselfie.ai/academy/visibility-suite/sandra-hero.png", width: 1200, height: 800 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visibility Suite — Know what to say. Show up. Get paid.",
    description: "Three workbooks. One visibility system. Launch price €97.",
    images: ["https://sselfie.ai/academy/visibility-suite/sandra-hero.png"],
  },
}

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

const C = {
  ink: "#0F0D0B",
  inkSoft: "#1B1713",
  cream: "#EDE9E2",
  creamWarm: "#F4F0E6",
  stone: "#C4B5A0",
  onCream: "#0F0D0B",
  onCreamSub: "#3D3830",
  muted: "#7A6F63",
  onDark: "#F4F0E6",
  onDarkSub: "#D8CFC0",
  onDarkMuted: "#A79B8B",
  div: "rgba(15,13,11,0.10)",
  divStrong: "rgba(15,13,11,0.18)",
  divDark: "rgba(244,240,230,0.16)",
}

const LP_CREAM = "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09)"
const LP_DARK = "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"

const PRODUCTS = [
  {
    id: "what_to_say",
    step: "01",
    label: "Message Clarity",
    title: "What To Say",
    price: "€47",
    description: "Find the words people remember.",
    included: ["one-line message", "Instagram bio", "hooks and CTAs"],
    image: "/academy/visibility-suite/what-to-say.png",
    href: "/academy/products/what_to_say",
  },
  {
    id: "show_up",
    step: "02",
    label: "Content Consistency",
    title: "Show Up",
    price: "€67",
    description: "Turn your message into a rhythm you can keep.",
    included: ["30-day content plan", "content goals", "soft and clear CTAs"],
    image: "/academy/visibility-suite/show-up.png",
    href: "/academy/products/show_up",
  },
  {
    id: "get_paid",
    step: "03",
    label: "Monetization Path",
    title: "Get Paid",
    price: "€97",
    description: "Give your visibility a next step.",
    included: ["one simple offer", "sales post", "7-day sales path"],
    image: "/academy/visibility-suite/get-paid.png",
    href: "/academy/products/get_paid",
  },
]

const SUITE_OFFER = {
  price: "€97",
  standardPrice: "€147",
  href: "/checkout/visibility-suite",
}

export default function VisibilitySuiteLandingPage() {
  return (
    <main
      className={`${inter.className} min-h-screen`}
      style={{ background: C.ink, color: C.onDark }}
    >
      {/* ─── Nav strip ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 md:px-20"
        style={{ borderBottom: `1px solid ${C.divDark}`, background: C.ink }}
      >
        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.4em]"
          style={{ color: C.onDarkMuted, fontWeight: 600 }}
        >
          SSELFIE
        </Link>
        <Link
          href="/auth/login"
          className="text-[11px] uppercase tracking-[0.3em] transition-opacity hover:opacity-70"
          style={{ color: C.onDarkMuted, fontWeight: 600 }}
        >
          Log In
        </Link>
      </div>

      {/* ─── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]"
        style={{ borderBottom: `1px solid ${C.divDark}`, background: C.ink }}
      >
        <div className="px-6 py-14 md:px-20 md:py-20">
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.onDarkMuted, fontWeight: 600 }}
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
              color: C.onDark,
              textShadow: LP_DARK,
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
            style={{ color: C.onDarkSub, fontWeight: 400 }}
          >
            A simple visibility system for women who want to know what to say, what to post, and
            how to build their first clear path from content to income. Get the full path for €97
            during the launch window.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={SUITE_OFFER.href}
              className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
              style={{ background: C.creamWarm, color: C.ink, fontWeight: 600 }}
            >
              Get The Visibility To Paid Suite
            </Link>
            <Link
              href="/selfie-guide"
              className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-70"
              style={{ border: `1px solid ${C.divDark}`, color: C.onDarkSub, fontWeight: 600 }}
            >
              Free Guide First
            </Link>
          </div>
          <p
            className="mt-5 text-[11px] uppercase tracking-[0.28em]"
            style={{ color: C.onDarkMuted, fontWeight: 600 }}
          >
            Launch price {SUITE_OFFER.price} · regular {SUITE_OFFER.standardPrice}
          </p>
        </div>

        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 520 }}>
          <Image
            src="/academy/visibility-suite/sandra-hero.png"
            alt="Sandra — founder of SSELFIE"
            fill
            sizes="(min-width: 1024px) 36vw, 0vw"
            className="object-cover object-top"
            priority
          />
        </div>
      </section>

      {/* ─── Suite offer ───────────────────────────────────────────────────── */}
      <section
        className="px-6 py-10 md:px-20 md:py-14"
        style={{ borderBottom: `1px solid ${C.div}`, background: C.creamWarm, color: C.onCream }}
      >
        <div
          className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8"
          style={{ background: C.cream, border: `1px solid ${C.divStrong}` }}
        >
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Best Next Step
            </p>
            <h2
              className={`${cormorant.className} mt-3 uppercase`}
              style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 300, lineHeight: 1.04 }}
            >
              Get the full Visibility To Paid Suite.
            </h2>
            <p
              className="mt-3 max-w-xl text-[14px] leading-[1.68]"
              style={{ color: C.onCreamSub, fontWeight: 400 }}
            >
              What To Say, Show Up, Get Paid, and your Maya Visibility Plan in one guided path.
            </p>
          </div>
          <div className="md:text-right">
            <p className={`${cormorant.className}`} style={{ fontSize: 44, fontWeight: 300 }}>
              {SUITE_OFFER.price}
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Launch price · regular {SUITE_OFFER.standardPrice}
            </p>
            <Link
              href={SUITE_OFFER.href}
              className="mt-5 inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
              style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
            >
              Get The Visibility To Paid Suite
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Three products ─────────────────────────────────────────────────── */}
      <section
        id="products"
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}`, background: C.creamWarm, color: C.onCream }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          The System
        </p>
        <h2
          className={`${cormorant.className} mt-4 uppercase`}
          style={{
            fontWeight: 300,
            fontSize: "clamp(30px, 5vw, 52px)",
            lineHeight: 1.02,
            textShadow: LP_CREAM,
          }}
        >
          Three workbooks. One path.
        </h2>
        <p
          className="mt-4 max-w-xl text-[14px] leading-[1.68]"
          style={{ color: C.onCreamSub, fontWeight: 400 }}
        >
          Find your message, plan content you can keep up with, and build one clear offer.
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
                <p
                  className="mt-5 text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: C.muted, fontWeight: 600 }}
                >
                  You leave with:
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
                    Start Step {product.step}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── From Sandra ────────────────────────────────────────────────────── */}
      <section
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.56fr)]"
        style={{ borderBottom: `1px solid ${C.divDark}`, background: C.ink, color: C.onDark }}
      >
        <div className="px-6 py-14 md:px-20 md:py-20">
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.onDarkMuted, fontWeight: 600 }}
          >
            From Sandra
          </p>
          <h2
            className={`${cormorant.className} mt-6 uppercase`}
            style={{
              fontWeight: 300,
              fontSize: "clamp(28px, 5vw, 52px)",
              lineHeight: 1.02,
              color: C.onDark,
              textShadow: LP_DARK,
            }}
          >
            “I built this because I needed the order myself.”
          </h2>
          <div
            className="mt-6 space-y-3 max-w-lg text-[15px] leading-[1.72]"
            style={{ color: C.onDarkSub, fontWeight: 400 }}
          >
            <p>Message first.</p>
            <p>Content second.</p>
            <p>Offer third.</p>
            <p>That is the part I was missing when I was posting, building, and trying to figure it all out at once.</p>
          </div>
          <p
            className={`${cormorant.className} mt-8`}
            style={{ fontSize: 20, fontWeight: 300, color: C.stone, fontStyle: "italic" }}
          >
            — Sandra
          </p>
        </div>

        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 500 }}>
          <Image
            src="/academy/visibility-suite/sandra-founder.webp"
            alt="Sandra — SSELFIE founder"
            fill
            sizes="(min-width: 1024px) 28vw, 0vw"
            className="object-cover object-center"
          />
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────────────── */}
      <section
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}`, background: C.creamWarm, color: C.onCream }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          How It Works
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-4">
          {[
            {
              num: "1",
              title: "Start with Step 01",
              body: "Get your message clear first.",
            },
            {
              num: "2",
              title: "Unlock the path",
              body: "Move into content and offer when you are ready.",
            },
            {
              num: "3",
              title: "Build in order",
              body: "Message first. Content second. Offer third.",
            },
            {
              num: "4",
              title: "Generate your Maya Plan",
              body: "Generate your Maya Visibility Plan and turn your answers into your next 7 days.",
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
      <section className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 480 }}>
          <Image
            src="/academy/visibility-suite/sandra-sprint.png"
            alt="Sandra — private sprint"
            fill
            sizes="(min-width: 1024px) 36vw, 0vw"
            className="object-cover object-top"
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
            Want help turning this into
            <br />
            a real business foundation?
          </h2>
          <p
            className="mt-6 max-w-md text-[14px] leading-[1.68]"
            style={{ color: "rgba(244,240,230,0.72)", fontWeight: 400 }}
          >
            Apply for the 4-week private sprint and build the full path with Sandra.
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
        style={{ borderTop: `1px solid ${C.div}`, background: C.creamWarm }}
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
