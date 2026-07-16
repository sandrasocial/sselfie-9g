import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import VisibilitySuiteMayaChat from "@/components/academy/visibility-suite-maya-chat"
import { VisibilityPlanGenerator } from "@/components/academy/visibility-plan-generator"
import { VISIBILITY_MINI_PRODUCTS } from "@/lib/visibility-products"

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
  cream: "#F5F5F5",
  creamWarm: "#FFFFFF",
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
      "Find the words that make people understand who you are, what you help with, and why they should trust you.",
    pathQuestion: "What do I say?",
    included: [
      "30 caption frameworks for everyday posting",
      "Prompt structures to keep your voice consistent",
      "Hooks and simple CTAs so people know what to do next.",
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
    description: "Know what to post so your content builds trust, connection, and momentum.",
    pathQuestion: "What do I post?",
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
    description: "Build one simple offer, one sales post, and one clear path to invite your first buyers.",
    pathQuestion: "What do I sell?",
    included: [
      "Revenue path map based on your current audience",
      "Make your offer easy to understand and easier to say out loud.",
      "90-day execution cadence with launch checkpoints",
    ],
    image: "/academy/visibility-suite/get-paid.png",
    workbookUrl: "/academy/get_paid/",
    purchaseUrl: "/academy/products/get_paid",
  },
]

const SUITE_FOCUSED_TOOLS = VISIBILITY_MINI_PRODUCTS.filter(product =>
  ["concept_cards_pack", "caption_sprint", "feed_reset_9grid", "ai_photo_refresh"].includes(product.id)
)

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
            A simple visibility system for women who want to know what to say, what to post, and
            how to build their first clear path from content to income.
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
                  Ask Maya
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/academy/products/what_to_say"
                  className="px-8 py-[13px] text-[10px] uppercase tracking-[0.22em]"
                  style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
                >
                  Start With What To Say
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
          Your Visibility To Paid Path
        </p>
        <p
          className="mt-3 max-w-xl text-[14px] leading-[1.72]"
          style={{ color: C.onCreamSub, fontWeight: 400 }}
        >
          Visibility To Paid is a simple 3-part system that helps you find your message, plan
          content you can actually keep up with, and build one clear offer so your online presence
          finally has a direction.
        </p>

        <div className="mt-6 grid gap-2 md:grid-cols-4" aria-label="Visibility To Paid path">
          {[
            { step: "01", title: "What To Say" },
            { step: "02", title: "Show Up" },
            { step: "03", title: "Get Paid" },
            { step: "04", title: "Maya Visibility Plan" },
          ].map(item => (
            <div
              key={item.step}
              className="px-4 py-3"
              style={{ border: `1px solid ${C.divStrong}`, background: C.cream }}
            >
              <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: C.muted, fontWeight: 600 }}>
                {item.step}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: C.ink, fontWeight: 600 }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>

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
                  <p
                    className="mt-3 text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: C.muted, fontWeight: 600 }}
                  >
                    Answers: {product.pathQuestion}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {product.included.map(item => (
                      <li
                        key={item}
                        className="flex gap-2 text-[12px] leading-[1.6]"
                        style={{ color: C.onCreamSub, fontWeight: 400 }}
                      >
                        <span style={{ color: C.stone, flexShrink: 0 }}>-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={product.workbookUrl}
                    className="mt-7 inline-flex text-[10px] uppercase tracking-[0.28em] transition-opacity hover:opacity-70"
                    style={{ color: C.ink, fontWeight: 600 }}
                  >
                    {product.id === "what_to_say" ? "Start Step 01" : `Continue To Step ${product.step}`}
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
                    · {product.included[0]}, and more.
                  </p>
                  <Link
                    href={product.purchaseUrl}
                    className="mt-7 inline-flex text-[10px] uppercase tracking-[0.28em] transition-opacity hover:opacity-70"
                    style={{ color: C.stone, fontWeight: 600 }}
                  >
                    Unlock Step {product.step}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        {ownedCount > 0 ? (
          <div id="step-04">
            <VisibilityPlanGenerator />
          </div>
        ) : null}
      </section>

      <section
        className="px-6 py-12 md:px-20 md:py-16"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          Focused Tools
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
          Use one tool at a time.
        </h2>
        <p
          className="mt-4 max-w-xl text-[14px] leading-[1.72]"
          style={{ color: C.onCreamSub, fontWeight: 400 }}
        >
          These are the stripped Studio features from the Suite. Each one opens as its own focused
          workspace, so you do not have to sort through the full Studio.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SUITE_FOCUSED_TOOLS.map(product => (
            <Link
              key={product.id}
              href={`/academy/access/${product.slug}`}
              className="group border p-5 transition-opacity hover:opacity-80"
              style={{ borderColor: C.divStrong, background: C.cream }}
            >
              <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: C.muted, fontWeight: 600 }}>
                {product.eyebrow}
              </p>
              <h3 className="mt-3 text-[15px] font-semibold">{product.firstAction}</h3>
              <p className="mt-3 text-[12px] leading-[1.62]" style={{ color: C.onCreamSub }}>
                {product.promise}
              </p>
            </Link>
          ))}
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
          Turn your path into your next move.
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
              Unlock one workbook to open Maya. She will help you stay in order and turn your
              answers into the next draft, plan, or sales step.
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

    </main>
  )
}
