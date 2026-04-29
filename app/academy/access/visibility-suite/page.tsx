import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import VisibilitySuiteMayaChat from "@/components/academy/visibility-suite-maya-chat"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
})

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

const SUITE_PRODUCTS = [
  {
    id: "what_to_say",
    step: "01",
    label: "Message Clarity",
    title: "What to Say",
    description:
      "The exact caption frameworks, voice prompts, and CTA structures that make your message land every time you post.",
    included: [
      "30 caption frameworks for everyday posting",
      "Prompt structures to keep your voice consistent",
      "Quick hooks and closing CTAs for conversion",
    ],
    image: "/academy/visibility-suite/what-to-say.png",
    workbookUrl: "/academy/what_to_say/",
    purchaseUrl: "/academy/products/what_to_say",
  },
  {
    id: "show_up",
    step: "02",
    label: "Content Consistency",
    title: "Show Up",
    description:
      "A 30-day posting rhythm and weekly batching workflow so you stop winging it and start showing up with intention.",
    included: [
      "30-day posting rhythm mapped by content type",
      "Weekly batching workflow to reduce content stress",
      "Visibility-first structure for stronger reach",
    ],
    image: "/academy/visibility-suite/show-up.png",
    workbookUrl: "/academy/show_up/",
    purchaseUrl: "/academy/products/show_up",
  },
  {
    id: "get_paid",
    step: "03",
    label: "Monetization Path",
    title: "Get Paid",
    description:
      "A revenue path map, offer alignment guide, and 90-day execution cadence so attention actually converts.",
    included: [
      "Revenue path map based on your current audience",
      "Offer and message alignment for higher intent",
      "90-day execution cadence with launch checkpoints",
    ],
    image: "/academy/visibility-suite/get-paid.png",
    workbookUrl: "/academy/get_paid/",
    purchaseUrl: "/academy/products/get_paid",
  },
]

export default async function VisibilitySuitePage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/visibility-suite")
  const entitlementState = await getAcademyEntitlementState(neonUser.id)

  const accessibleIds = new Set(entitlementState.accessibleProductIds)
  const membershipActive = entitlementState.membershipActive

  const hasWhatToSay = membershipActive || accessibleIds.has("what_to_say")
  const hasShowUp = membershipActive || accessibleIds.has("show_up")
  const hasGetPaid = membershipActive || accessibleIds.has("get_paid")

  const ownedCount = [hasWhatToSay, hasShowUp, hasGetPaid].filter(Boolean).length
  const suiteUnlocked = ownedCount === 3

  const accessMap: Record<string, boolean> = {
    what_to_say: hasWhatToSay,
    show_up: hasShowUp,
    get_paid: hasGetPaid,
  }

  const ownedProductIds = SUITE_PRODUCTS.filter(p => accessMap[p.id]).map(p => p.id)

  await logAnalyticsEvent({
    eventName: "visibility_suite_access_opened",
    userId: neonUser.id,
    path: "/academy/access/visibility-suite",
    properties: { owned_count: ownedCount },
  })

  return (
    <main
      className={`${inter.className} min-h-screen`}
      style={{ background: C.creamWarm, color: C.onCream }}
    >
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]"
        style={{ borderBottom: `1px solid ${C.divStrong}` }}
      >
        <div className="px-6 py-14 md:px-20 md:py-20">
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.muted, fontWeight: 600 }}
          >
            Your Paid Brand System
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
            Three workbooks. One clear path. From message clarity to a posting rhythm to a
            monetization system — built to work together.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {suiteUnlocked ? (
              <>
                <a
                  href="#step-01"
                  className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]"
                  style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
                >
                  Start Here
                </a>
                <a
                  href="#maya"
                  className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    border: `1px solid ${C.divStrong}`,
                    color: C.ink,
                    fontWeight: 600,
                  }}
                >
                  Open Maya
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/academy/products/what_to_say"
                  className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]"
                  style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
                >
                  Get the Suite
                </Link>
                <Link
                  href="/selfie-guide"
                  className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    border: `1px solid ${C.divStrong}`,
                    color: C.ink,
                    fontWeight: 600,
                  }}
                >
                  Free Guide
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 480 }}>
          <Image
            src="/academy/visibility-suite/hero.png"
            alt="Woman working at desk"
            fill
            sizes="(min-width: 1024px) 36vw, 0vw"
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* ─── Three-step path ──────────────────────────────────────────────── */}
      <section
        id="step-01"
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          The Path
        </p>
        <p
          className="mt-3 max-w-xl text-[14px] leading-[1.72]"
          style={{ color: C.onCreamSub, fontWeight: 400 }}
        >
          Work through each workbook in order. Each one builds on the last.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {SUITE_PRODUCTS.map(product => {
            const unlocked = accessMap[product.id]

            return unlocked ? (
              /* ── Unlocked card ── */
              <article
                key={product.id}
                className="group overflow-hidden"
                style={{
                  background: C.creamWarm,
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
                  <a
                    href={product.workbookUrl}
                    className="mt-7 inline-flex text-[10px] uppercase tracking-[0.28em] transition-opacity hover:opacity-70"
                    style={{ color: C.ink, fontWeight: 600 }}
                  >
                    Open workbook
                  </a>
                </div>
              </article>
            ) : (
              /* ── Locked card ── */
              <article
                key={product.id}
                className="group overflow-hidden"
                style={{
                  background: C.ink,
                  border: `1px solid rgba(244,240,230,0.10)`,
                  color: C.creamWarm,
                }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(min-width: 1024px) 28vw, (min-width: 768px) 45vw, 100vw"
                    className="object-cover opacity-50 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0" style={{ background: "rgba(15,13,11,0.45)" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p
                      className="text-[9px] uppercase tracking-[0.5em]"
                      style={{ color: "rgba(244,240,230,0.55)", fontWeight: 600 }}
                    >
                      Locked
                    </p>
                  </div>
                </div>
                <div className="p-6 md:p-7">
                  <div className="flex items-baseline gap-4">
                    <span
                      className={`${cormorant.className}`}
                      style={{
                        fontSize: 48,
                        fontWeight: 300,
                        lineHeight: 1,
                        color: "rgba(196,181,160,0.40)",
                      }}
                    >
                      {product.step}
                    </span>
                    <p
                      className="text-[9px] uppercase tracking-[0.4em]"
                      style={{ color: "rgba(244,240,230,0.40)", fontWeight: 600 }}
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
                      color: C.creamWarm,
                    }}
                  >
                    {product.title}
                  </h2>
                  <p
                    className="mt-4 text-[13px] leading-[1.7]"
                    style={{ color: "rgba(244,240,230,0.60)", fontWeight: 400 }}
                  >
                    {product.description}
                  </p>
                  <p
                    className="mt-5 text-[12px] leading-[1.6]"
                    style={{ color: "rgba(244,240,230,0.40)", fontWeight: 400 }}
                  >
                    — {product.included[0]}, and more.
                  </p>
                  <Link
                    href={product.purchaseUrl}
                    className="mt-7 inline-flex text-[10px] uppercase tracking-[0.28em] transition-opacity hover:opacity-70"
                    style={{ color: C.stone, fontWeight: 600 }}
                  >
                    Unlock
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* ─── Maya ─────────────────────────────────────────────────────────── */}
      <section
        id="maya"
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          Maya
        </p>
        <h2
          className={`${cormorant.className} mt-5 uppercase`}
          style={{
            fontWeight: 300,
            fontSize: "clamp(28px, 5vw, 52px)",
            lineHeight: 1.04,
            textShadow: LP_CREAM,
          }}
        >
          Ask Maya anything.
        </h2>

        {ownedCount > 0 ? (
          <div className="mt-8">
            <VisibilitySuiteMayaChat ownedProducts={ownedProductIds} />
          </div>
        ) : (
          <div
            className="mt-8 max-w-lg p-8"
            style={{ background: C.cream, border: `1px solid ${C.divStrong}` }}
          >
            <p
              className="text-[13px] leading-[1.7]"
              style={{ color: C.onCreamSub, fontWeight: 400 }}
            >
              Unlock one workbook to open Maya. She will guide you through the suite, review your
              answers, and build your weekly plan.
            </p>
            <Link
              href="/academy/products/what_to_say"
              className="mt-6 inline-flex text-[10px] uppercase tracking-[0.28em] transition-opacity hover:opacity-70"
              style={{ color: C.ink, fontWeight: 600 }}
            >
              Start with What to Say
            </Link>
          </div>
        )}
      </section>

      {/* ─── Sprint upsell ────────────────────────────────────────────────── */}
      <section className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
        <div className="relative hidden overflow-hidden lg:block" style={{ minHeight: 480 }}>
          <Image
            src="/academy/visibility-suite/sprint.png"
            alt="Laptop and straw hat by the water"
            fill
            sizes="(min-width: 1024px) 36vw, 0vw"
            className="object-cover"
          />
        </div>

        <div
          className="px-6 py-14 md:px-16 md:py-20"
          style={{ background: C.ink, color: C.creamWarm }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.stone, fontWeight: 600 }}
          >
            Your Next Move
          </p>
          <h2
            className={`${cormorant.className} mt-6 uppercase`}
            style={{
              fontWeight: 300,
              fontSize: "clamp(34px, 6vw, 64px)",
              lineHeight: 1.0,
              letterSpacing: "-0.015em",
            }}
          >
            The 4-Week
            <br />
            Private Sprint.
          </h2>
          <p
            className="mt-6 max-w-md text-[15px] leading-[1.78]"
            style={{ color: "rgba(244,240,230,0.72)", fontWeight: 400 }}
          >
            You now have the message, the posting rhythm, and the offer direction. If you want to
            turn this into your first 10K path, apply for the 4-week private sprint.
          </p>
          <Link
            href="/work-with-me"
            className="mt-9 inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
            style={{ background: C.creamWarm, color: C.ink, fontWeight: 600 }}
          >
            Apply Now
          </Link>
        </div>
      </section>
    </main>
  )
}
