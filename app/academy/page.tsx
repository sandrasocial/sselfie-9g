import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { formatDurationLabel } from "@/app/academy/_lib/client-utils"

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
  weight: ["300", "500"],
})

export default async function AcademyPage() {
  const { neonUser } = await requireAcademyPageUser("/academy")
  const home = await getAcademyHomeState(neonUser.id)

  return (
    <main className="min-h-screen bg-[#0d0c0b] text-[#f0ede8]">
      <section className="border-b border-[rgba(195,190,182,0.15)] px-6 py-14 md:px-20 md:py-20">
        <p
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
          style={{ fontWeight: 500 }}
        >
          My Library
        </p>
        <h1
          className={`${cormorant.className} mt-6 text-5xl uppercase md:text-7xl`}
          style={{ fontWeight: 300, lineHeight: 0.92 }}
        >
          {home.hero.title}
          <br />
          Built for return.
        </h1>
        <p
          className={`${inter.className} mt-5 max-w-3xl text-sm leading-8 text-[#c8c4bb]`}
          style={{ fontWeight: 300 }}
        >
          {home.hero.description}
        </p>
        {home.hero.primaryLink || home.hero.secondaryLink ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {home.hero.primaryLink ? (
              <Link
                href={home.hero.primaryLink.href}
                className={`${inter.className} inline-flex rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.16)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.24)]`}
                style={{ fontWeight: 500 }}
              >
                {home.hero.primaryLink.label}
              </Link>
            ) : null}
            {home.hero.secondaryLink ? (
              <Link
                href={home.hero.secondaryLink.href}
                className={`${inter.className} inline-flex rounded-full border border-[rgba(195,190,182,0.25)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.12)]`}
                style={{ fontWeight: 500 }}
              >
                {home.hero.secondaryLink.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="px-6 py-10 md:px-20 md:py-14">
        {!home.hasAccess ? (
          <div className="max-w-3xl border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] p-8 backdrop-blur-[50px]">
            <p
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
              style={{ fontWeight: 500 }}
            >
              Locked
            </p>
            <p
              className={`${inter.className} mt-4 max-w-xl text-sm leading-8 text-[#c8c4bb]`}
              style={{ fontWeight: 300 }}
            >
              Your SSELFIE content will appear here once you have access. Start with the guide, or
              step into the Starter Kit if you want the first paid result.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/starter-kit"
                className={`${inter.className} inline-flex rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.16)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.24)]`}
                style={{ fontWeight: 500 }}
              >
                See Starter Kit
              </Link>
              <Link
                href="/selfie-guide"
                className={`${inter.className} inline-flex rounded-full border border-[rgba(195,190,182,0.25)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.12)]`}
                style={{ fontWeight: 500 }}
              >
                Free Guide
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {home.ownedProducts.length > 0 ? (
              <section>
                <p
                  className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
                  style={{ fontWeight: 500 }}
                >
                  Your Content
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {home.ownedProducts.map((product) => (
                    <article
                      key={product.id}
                      className="border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.10)] p-6"
                    >
                      <p
                        className={`${inter.className} text-[10px] uppercase tracking-[0.4em] text-[#8a8780]`}
                        style={{ fontWeight: 500 }}
                      >
                        {product.eyebrow}
                      </p>
                      <h2
                        className={`${cormorant.className} mt-4 text-3xl uppercase text-[#f0ede8]`}
                        style={{ fontWeight: 300, lineHeight: 0.98 }}
                      >
                        {product.name}
                      </h2>
                      <p
                        className={`${inter.className} mt-3 text-sm leading-8 text-[#c8c4bb]`}
                        style={{ fontWeight: 300 }}
                      >
                        {product.tagline || product.description}
                      </p>
                      <Link
                        href={product.accessUrl}
                        className={`${inter.className} mt-6 inline-flex text-[11px] uppercase tracking-[0.35em] text-[#f0ede8] transition-opacity hover:opacity-80`}
                        style={{ fontWeight: 500 }}
                      >
                        → {product.actionLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {home.courses.length > 0 ? (
              <section>
                <p
                  className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
                  style={{ fontWeight: 500 }}
                >
                  Continue Your Courses
                </p>
                <ol className="mt-5 space-y-0 border-t border-[rgba(195,190,182,0.15)]">
                  {home.courses.map((course, index) => {
                    const actionLabel = course.started ? "Continue" : "Start"
                    const targetLessonId = course.firstIncompleteLessonId
                    const href = targetLessonId
                      ? `/academy/courses/${course.id}/lessons/${targetLessonId}`
                      : `/academy/courses/${course.id}`

                    return (
                      <li
                        key={course.id}
                        className="border-b border-[rgba(195,190,182,0.15)] py-8 md:py-10"
                      >
                        <div className="grid gap-5 md:grid-cols-[88px_minmax(0,1fr)_220px] md:items-start md:gap-6">
                          <p
                            className={`${cormorant.className} text-4xl text-[#c8c4bb] md:text-5xl`}
                            style={{ fontWeight: 300, lineHeight: 1 }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </p>

                          <div className="space-y-3">
                            <Link href={`/academy/courses/${course.id}`} className="block">
                              <h2
                                className={`${inter.className} text-[11px] uppercase tracking-[0.5em] text-[#f0ede8] transition-opacity hover:opacity-80`}
                                style={{ fontWeight: 500 }}
                              >
                                {course.title}
                              </h2>
                            </Link>
                            {course.description ? (
                              <p
                                className={`${inter.className} max-w-2xl text-sm leading-8 text-[#c8c4bb]`}
                                style={{ fontWeight: 300 }}
                              >
                                {course.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-4 md:text-right">
                            <p
                              className={`${inter.className} text-[10px] uppercase tracking-[0.4em] text-[#8a8780]`}
                              style={{ fontWeight: 500 }}
                            >
                              {course.lessonCount} lessons ·{" "}
                              {formatDurationLabel(course.totalDurationSeconds)}
                            </p>

                            {course.started ? (
                              <div className="space-y-2">
                                <div className="h-[3px] w-full bg-[rgba(195,190,182,0.12)]">
                                  <div
                                    className="h-full bg-[#c9a96e]"
                                    style={{ width: `${Math.max(course.progressPercentage, 4)}%` }}
                                  />
                                </div>
                                <p
                                  className={`${inter.className} text-[10px] uppercase tracking-[0.35em] text-[#8a8780]`}
                                  style={{ fontWeight: 500 }}
                                >
                                  {course.progressPercentage}% complete
                                </p>
                              </div>
                            ) : null}

                            <Link
                              href={href}
                              className={`${inter.className} inline-flex text-[11px] uppercase tracking-[0.35em] text-[#f0ede8] transition-opacity hover:opacity-80`}
                              style={{ fontWeight: 500 }}
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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              {home.nextStep ? (
                <section className="border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.10)] p-6 md:p-8">
                  <p
                    className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
                    style={{ fontWeight: 500 }}
                  >
                    {home.nextStep.eyebrow}
                  </p>
                  <h2
                    className={`${cormorant.className} mt-4 text-4xl uppercase text-[#f0ede8]`}
                    style={{ fontWeight: 300, lineHeight: 0.98 }}
                  >
                    {home.nextStep.title}
                  </h2>
                  <p
                    className={`${inter.className} mt-4 max-w-2xl text-sm leading-8 text-[#c8c4bb]`}
                    style={{ fontWeight: 300 }}
                  >
                    {home.nextStep.description}
                  </p>
                  <Link
                    href={home.nextStep.href}
                    className={`${inter.className} mt-6 inline-flex rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.16)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.24)]`}
                    style={{ fontWeight: 500 }}
                  >
                    {home.nextStep.ctaLabel}
                  </Link>
                </section>
              ) : null}

              {home.mayaCard ? (
                <section className="border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] p-6 md:p-8">
                  <p
                    className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
                    style={{ fontWeight: 500 }}
                  >
                    {home.mayaCard.eyebrow}
                  </p>
                  <h2
                    className={`${cormorant.className} mt-4 text-3xl uppercase text-[#f0ede8]`}
                    style={{ fontWeight: 300, lineHeight: 0.98 }}
                  >
                    {home.mayaCard.title}
                  </h2>
                  <p
                    className={`${inter.className} mt-4 text-sm leading-8 text-[#c8c4bb]`}
                    style={{ fontWeight: 300 }}
                  >
                    {home.mayaCard.description}
                  </p>
                  <Link
                    href={home.mayaCard.href}
                    className={`${inter.className} mt-6 inline-flex text-[11px] uppercase tracking-[0.35em] text-[#f0ede8] transition-opacity hover:opacity-80`}
                    style={{ fontWeight: 500 }}
                  >
                    → {home.mayaCard.ctaLabel}
                  </Link>
                </section>
              ) : null}
            </div>

            {home.lockedProducts.length > 0 ? (
              <section>
                <p
                  className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
                  style={{ fontWeight: 500 }}
                >
                  Inside SSELFIE
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {home.lockedProducts.map((product) => (
                    <article
                      key={product.id}
                      className="border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.06)] p-6"
                    >
                      <p
                        className={`${inter.className} text-[10px] uppercase tracking-[0.4em] text-[#8a8780]`}
                        style={{ fontWeight: 500 }}
                      >
                        {product.eyebrow}
                      </p>
                      <h2
                        className={`${cormorant.className} mt-4 text-3xl uppercase text-[#f0ede8]`}
                        style={{ fontWeight: 300, lineHeight: 0.98 }}
                      >
                        {product.title}
                      </h2>
                      <p
                        className={`${inter.className} mt-3 text-sm leading-8 text-[#c8c4bb]`}
                        style={{ fontWeight: 300 }}
                      >
                        {product.description}
                      </p>
                      <Link
                        href={product.href}
                        className={`${inter.className} mt-6 inline-flex text-[11px] uppercase tracking-[0.35em] text-[#f0ede8] transition-opacity hover:opacity-80`}
                        style={{ fontWeight: 500 }}
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
