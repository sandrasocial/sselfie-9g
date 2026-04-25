import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { formatDurationLabel } from "@/app/academy/_lib/client-utils"
import { logAnalyticsEvent } from "@/lib/analytics/events"

import {
  getAcademyHomeState,
  requireAcademyPageUser,
} from "@/app/academy/_lib/course-library"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
})

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ink: "#0F0D0B",
  inkSoft: "#1E1A15",
  cream: "#EDE9E2",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(237,233,226,0.10)",
}

const LP =
  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"

// ─── Reusable style helpers ───────────────────────────────────────────────────
const eyebrow = `text-[10px] uppercase tracking-[0.5em]`
const solidBtn =
  "inline-flex items-center px-8 py-[13px] text-[10px] font-semibold uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
const ghostBtn =
  "inline-flex items-center px-6 py-3 text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80"

export default async function AcademyPage() {
  const { neonUser } = await requireAcademyPageUser("/academy")
  const home = await getAcademyHomeState(neonUser.id)

  await logAnalyticsEvent({
    eventName: "academy_home_opened",
    userId: String(neonUser.id),
    path: "/academy",
    properties: {
      source: "academy_home",
      owned_product_count: home.ownedProducts.length,
      course_count: home.courses.length,
      has_access: home.hasAccess,
    },
  })

  return (
    <main
      className="min-h-screen"
      style={{ background: C.ink, color: C.cream }}
    >
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-16 md:px-20 md:py-24"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className={`${inter.className} ${eyebrow}`}
          style={{ color: C.muted, fontWeight: 600 }}
        >
          My Library
        </p>
        <h1
          className={`${cormorant.className} mt-6 uppercase`}
          style={{
            fontWeight: 300,
            fontSize: "clamp(36px, 7vw, 70px)",
            lineHeight: 1.03,
            letterSpacing: "-0.02em",
            textShadow: LP,
          }}
        >
          {home.hero.title}
          <br />
          Built for return.
        </h1>
        <p
          className={`${inter.className} mt-6 max-w-2xl text-[15px] leading-[1.78]`}
          style={{ color: C.stone, fontWeight: 300 }}
        >
          {home.hero.description}
        </p>
        {home.hero.primaryLink || home.hero.secondaryLink ? (
          <div className="mt-10 flex flex-wrap gap-3">
            {home.hero.primaryLink ? (
              <Link
                href={home.hero.primaryLink.href}
                className={`${inter.className} ${solidBtn}`}
                style={{
                  background: C.cream,
                  color: C.ink,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                {home.hero.primaryLink.label}
              </Link>
            ) : null}
            {home.hero.secondaryLink ? (
              <Link
                href={home.hero.secondaryLink.href}
                className={`${inter.className} ${ghostBtn}`}
                style={{
                  color: C.cream,
                  border: "1px solid rgba(237,233,226,0.22)",
                }}
              >
                {home.hero.secondaryLink.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ─── Body ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-12 md:px-20 md:py-16">
        {!home.hasAccess ? (
          /* ── Locked state ── */
          <div
            className="max-w-2xl p-8"
            style={{
              background: C.inkSoft,
              border: `1px solid ${C.div}`,
            }}
          >
            <p
              className={`${inter.className} ${eyebrow}`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Locked
            </p>
            <p
              className={`${inter.className} mt-5 max-w-xl text-[15px] leading-[1.78]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              Your SSELFIE content will appear here once you have access. Start
              with the guide, or step into the Starter Kit if you want the first
              paid result.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/starter-kit"
                className={`${inter.className} ${solidBtn}`}
                style={{
                  background: C.cream,
                  color: C.ink,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                See Starter Kit
              </Link>
              <Link
                href="/selfie-guide"
                className={`${inter.className} ${ghostBtn}`}
                style={{
                  color: C.cream,
                  border: "1px solid rgba(237,233,226,0.22)",
                }}
              >
                Free Guide
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-14">
            {/* ── Owned products ── */}
            {home.ownedProducts.length > 0 ? (
              <section>
                <p
                  className={`${inter.className} ${eyebrow}`}
                  style={{ color: C.muted, fontWeight: 600 }}
                >
                  Your Content
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {home.ownedProducts.map((product) => (
                    <article
                      key={product.id}
                      className="p-7"
                      style={{
                        background: C.inkSoft,
                        border: `1px solid ${C.div}`,
                      }}
                    >
                      <p
                        className={`${inter.className} ${eyebrow}`}
                        style={{ color: C.muted, fontWeight: 600 }}
                      >
                        {product.eyebrow}
                      </p>
                      <h2
                        className={`${cormorant.className} mt-5 uppercase`}
                        style={{
                          fontWeight: 300,
                          fontSize: "clamp(19px, 2.5vw, 26px)",
                          lineHeight: 1.18,
                          textShadow: LP,
                          color: C.cream,
                        }}
                      >
                        {product.name}
                      </h2>
                      <p
                        className={`${inter.className} mt-3 text-[15px] leading-[1.78]`}
                        style={{ color: C.stone, fontWeight: 300 }}
                      >
                        {product.tagline || product.description}
                      </p>
                      <Link
                        href={product.accessUrl}
                        className={`${inter.className} mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70`}
                        style={{ color: C.cream, fontWeight: 600 }}
                      >
                        → {product.actionLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {/* ── Courses ── */}
            {home.courses.length > 0 ? (
              <section>
                <p
                  className={`${inter.className} ${eyebrow}`}
                  style={{ color: C.muted, fontWeight: 600 }}
                >
                  Continue Your Courses
                </p>
                <ol
                  className="mt-6 space-y-0"
                  style={{ borderTop: `1px solid ${C.div}` }}
                >
                  {home.courses.map((course, index) => {
                    const actionLabel = course.started ? "Continue" : "Start"
                    const targetLessonId = course.firstIncompleteLessonId
                    const href = targetLessonId
                      ? `/academy/courses/${course.id}/lessons/${targetLessonId}`
                      : `/academy/courses/${course.id}`

                    return (
                      <li
                        key={course.id}
                        className="py-10 md:py-12"
                        style={{ borderBottom: `1px solid ${C.div}` }}
                      >
                        <div className="grid gap-6 md:grid-cols-[80px_minmax(0,1fr)_200px] md:items-start">
                          <p
                            className={`${cormorant.className}`}
                            style={{
                              fontWeight: 300,
                              fontSize: "clamp(36px, 5vw, 48px)",
                              lineHeight: 1,
                              color: C.stone,
                              textShadow: LP,
                            }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </p>

                          <div className="space-y-3">
                            <Link
                              href={`/academy/courses/${course.id}`}
                              className="block"
                            >
                              <h2
                                className={`${inter.className} text-[11px] uppercase tracking-[0.5em] transition-opacity hover:opacity-70`}
                                style={{ color: C.cream, fontWeight: 600 }}
                              >
                                {course.title}
                              </h2>
                            </Link>
                            {course.description ? (
                              <p
                                className={`${inter.className} max-w-2xl text-[15px] leading-[1.78]`}
                                style={{ color: C.stone, fontWeight: 300 }}
                              >
                                {course.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-4 md:text-right">
                            <p
                              className={`${inter.className} ${eyebrow}`}
                              style={{ color: C.muted, fontWeight: 600 }}
                            >
                              {course.lessonCount} lessons ·{" "}
                              {formatDurationLabel(course.totalDurationSeconds)}
                            </p>

                            {course.started ? (
                              <div className="space-y-2">
                                <div
                                  className="h-[2px] w-full"
                                  style={{
                                    background: "rgba(237,233,226,0.10)",
                                  }}
                                >
                                  <div
                                    className="h-full"
                                    style={{
                                      width: `${Math.max(course.progressPercentage, 4)}%`,
                                      background: C.stone,
                                    }}
                                  />
                                </div>
                                <p
                                  className={`${inter.className} ${eyebrow}`}
                                  style={{ color: C.muted, fontWeight: 600 }}
                                >
                                  {course.progressPercentage}% complete
                                </p>
                              </div>
                            ) : null}

                            <Link
                              href={href}
                              className={`${inter.className} inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70`}
                              style={{ color: C.cream, fontWeight: 600 }}
                            >
                              → {actionLabel}
                            </Link>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            ) : null}

            {/* ── Next step + Maya ── */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              {home.nextStep ? (
                <section
                  className="p-8 md:p-10"
                  style={{
                    background: C.inkSoft,
                    border: `1px solid ${C.div}`,
                  }}
                >
                  <p
                    className={`${inter.className} ${eyebrow}`}
                    style={{ color: C.muted, fontWeight: 600 }}
                  >
                    {home.nextStep.eyebrow}
                  </p>
                  <h2
                    className={`${cormorant.className} mt-5 uppercase`}
                    style={{
                      fontWeight: 300,
                      fontSize: "clamp(28px, 4.5vw, 48px)",
                      lineHeight: 1.07,
                      letterSpacing: "-0.015em",
                      textShadow: LP,
                      color: C.cream,
                    }}
                  >
                    {home.nextStep.title}
                  </h2>
                  <p
                    className={`${inter.className} mt-5 max-w-xl text-[15px] leading-[1.78]`}
                    style={{ color: C.stone, fontWeight: 300 }}
                  >
                    {home.nextStep.description}
                  </p>
                  <Link
                    href={home.nextStep.href}
                    className={`${inter.className} ${solidBtn} mt-8`}
                    style={{
                      background: C.cream,
                      color: C.ink,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
                    }}
                  >
                    {home.nextStep.ctaLabel}
                  </Link>
                </section>
              ) : null}

              {home.mayaCard ? (
                <section
                  className="p-8"
                  style={{
                    border: `1px solid ${C.div}`,
                  }}
                >
                  <p
                    className={`${inter.className} ${eyebrow}`}
                    style={{ color: C.muted, fontWeight: 600 }}
                  >
                    {home.mayaCard.eyebrow}
                  </p>
                  <h2
                    className={`${cormorant.className} mt-5 uppercase`}
                    style={{
                      fontWeight: 300,
                      fontSize: "clamp(19px, 2.5vw, 26px)",
                      lineHeight: 1.18,
                      textShadow: LP,
                      color: C.cream,
                    }}
                  >
                    {home.mayaCard.title}
                  </h2>
                  <p
                    className={`${inter.className} mt-4 text-[15px] leading-[1.78]`}
                    style={{ color: C.stone, fontWeight: 300 }}
                  >
                    {home.mayaCard.description}
                  </p>
                  <Link
                    href={home.mayaCard.href}
                    className={`${inter.className} mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70`}
                    style={{ color: C.cream, fontWeight: 600 }}
                  >
                    → {home.mayaCard.ctaLabel}
                  </Link>
                </section>
              ) : null}
            </div>

            {/* ── Locked products (upsells) ── */}
            {home.lockedProducts.length > 0 ? (
              <section>
                <p
                  className={`${inter.className} ${eyebrow}`}
                  style={{ color: C.muted, fontWeight: 600 }}
                >
                  Inside SSELFIE
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {home.lockedProducts.map((product) => (
                    <article
                      key={product.id}
                      className="p-7"
                      style={{
                        border: `1px solid ${C.div}`,
                      }}
                    >
                      <p
                        className={`${inter.className} ${eyebrow}`}
                        style={{ color: C.muted, fontWeight: 600 }}
                      >
                        {product.eyebrow}
                      </p>
                      <h2
                        className={`${cormorant.className} mt-5 uppercase`}
                        style={{
                          fontWeight: 300,
                          fontSize: "clamp(19px, 2.5vw, 26px)",
                          lineHeight: 1.18,
                          textShadow: LP,
                          color: C.cream,
                        }}
                      >
                        {product.title}
                      </h2>
                      <p
                        className={`${inter.className} mt-3 text-[15px] leading-[1.78]`}
                        style={{ color: C.stone, fontWeight: 300 }}
                      >
                        {product.description}
                      </p>
                      <Link
                        href={product.href}
                        className={`${inter.className} mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70`}
                        style={{ color: C.stone, fontWeight: 600 }}
                      >
                        → {product.ctaLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
