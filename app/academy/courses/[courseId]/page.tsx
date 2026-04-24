import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import {
  formatDurationLabel,
  formatLessonDuration,
  getAccessibleCourseDetail,
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

export default async function AcademyCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const parsedCourseId = Number.parseInt(courseId, 10)

  if (!Number.isFinite(parsedCourseId) || parsedCourseId <= 0) {
    notFound()
  }

  const { neonUser } = await requireAcademyPageUser(`/academy/courses/${parsedCourseId}`)
  const course = await getAccessibleCourseDetail(neonUser.id, parsedCourseId)

  if (!course) {
    redirect("/academy")
  }

  return (
    <main className="min-h-screen bg-[#0d0c0b] text-[#f0ede8]">
      <section className="border-b border-[rgba(195,190,182,0.15)] px-6 py-14 md:px-20 md:py-20">
        <Link
          href="/academy"
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780] transition-opacity hover:opacity-80`}
          style={{ fontWeight: 500 }}
        >
          ← Back to My Library
        </Link>

        <p
          className={`${inter.className} mt-8 text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
          style={{ fontWeight: 500 }}
        >
          {course.lessonCount} lessons · {formatDurationLabel(course.totalDurationSeconds)}
        </p>

        <h1
          className={`${cormorant.className} mt-6 text-5xl uppercase md:text-7xl`}
          style={{ fontWeight: 300, lineHeight: 0.92 }}
        >
          {course.title}
        </h1>

        {course.description ? (
          <p
            className={`${inter.className} mt-5 max-w-3xl text-sm leading-8 text-[#c8c4bb]`}
            style={{ fontWeight: 300 }}
          >
            {course.description}
          </p>
        ) : null}
      </section>

      <section className="px-6 py-10 md:px-20 md:py-14">
        <ol className="space-y-0 border-t border-[rgba(195,190,182,0.15)]">
          {course.lessons.map((lesson) => (
            <li
              key={lesson.id}
              className={`border-b border-[rgba(195,190,182,0.15)] py-6 ${
                lesson.startHere ? "bg-[rgba(201,169,110,0.06)]" : ""
              }`}
            >
              <Link
                href={`/academy/courses/${course.id}/lessons/${lesson.id}`}
                className="grid gap-4 md:grid-cols-[72px_minmax(0,1fr)_140px] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${cormorant.className} text-3xl text-[#c8c4bb]`}
                    style={{ fontWeight: 300 }}
                  >
                    {String(lesson.lesson_number).padStart(2, "0")}
                  </span>
                  {lesson.completed ? (
                    <span className="text-sm text-[#c9a96e]">✓</span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p
                      className={`${inter.className} text-sm uppercase tracking-[0.18em] text-[#f0ede8]`}
                      style={{ fontWeight: 500 }}
                    >
                      {lesson.title}
                    </p>
                    {lesson.startHere ? (
                      <span
                        className={`${inter.className} text-[10px] uppercase tracking-[0.35em] text-[#c9a96e]`}
                        style={{ fontWeight: 500 }}
                      >
                        Start here →
                      </span>
                    ) : null}
                  </div>
                  {lesson.description ? (
                    <p
                      className={`${inter.className} text-sm leading-7 text-[#8a8780]`}
                      style={{ fontWeight: 300 }}
                    >
                      {lesson.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <span
                    className={`${inter.className} text-[11px] uppercase tracking-[0.3em] text-[#8a8780]`}
                    style={{ fontWeight: 500 }}
                  >
                    {formatLessonDuration(lesson.durationSeconds)}
                  </span>
                  <span
                    className={`${inter.className} text-[11px] uppercase tracking-[0.3em] text-[#c8c4bb]`}
                    style={{ fontWeight: 500 }}
                  >
                    Open →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
