import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import {
  formatDurationLabel,
  getAccessibleLibraryCourses,
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
  const { hasAccess, courses } = await getAccessibleLibraryCourses(neonUser.id)

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
          Your courses.
          <br />
          All in one place.
        </h1>
      </section>

      <section className="px-6 py-10 md:px-20 md:py-14">
        {!hasAccess ? (
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
              Your courses will appear here once you have access.
            </p>
            <Link
              href="/join/studio"
              className={`${inter.className} mt-8 inline-flex rounded-full border border-[rgba(195,190,182,0.25)] px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.15)]`}
              style={{ fontWeight: 500 }}
            >
              Join Studio
            </Link>
          </div>
        ) : (
          <ol className="space-y-0 border-t border-[rgba(195,190,182,0.15)]">
            {courses.map((course, index) => {
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
                        {course.lessonCount} lessons · {formatDurationLabel(course.totalDurationSeconds)}
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
        )}
      </section>
    </main>
  )
}
