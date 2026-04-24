import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { formatDurationLabel, formatLessonDuration } from "@/app/academy/_lib/client-utils"

import {
  getAccessibleCourseDetail,
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
    <main className="min-h-screen" style={{ background: C.ink, color: C.cream }}>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-16 md:px-20 md:py-24"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <Link
          href="/academy"
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em] transition-opacity hover:opacity-70`}
          style={{ color: C.muted, fontWeight: 600 }}
        >
          ← My Library
        </Link>

        <p
          className={`${inter.className} mt-10 text-[10px] uppercase tracking-[0.5em]`}
          style={{ color: C.muted, fontWeight: 600 }}
        >
          {course.lessonCount} lessons · {formatDurationLabel(course.totalDurationSeconds)}
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
          {course.title}
        </h1>

        {course.description ? (
          <p
            className={`${inter.className} mt-6 max-w-2xl text-[15px] leading-[1.78]`}
            style={{ color: C.stone, fontWeight: 300 }}
          >
            {course.description}
          </p>
        ) : null}
      </section>

      {/* ─── Lesson list ──────────────────────────────────────────────────── */}
      <section className="px-6 py-12 md:px-20 md:py-16">
        <ol
          className="space-y-0"
          style={{ borderTop: `1px solid ${C.div}` }}
        >
          {course.lessons.map((lesson) => (
            <li
              key={lesson.id}
              style={{ borderBottom: `1px solid ${C.div}` }}
            >
              <Link
                href={`/academy/courses/${course.id}/lessons/${lesson.id}`}
                className="grid gap-5 py-8 transition-opacity hover:opacity-80 md:grid-cols-[72px_minmax(0,1fr)_140px] md:items-center md:py-10"
              >
                {/* Number + completion */}
                <div className="flex items-center gap-3">
                  <span
                    className={`${cormorant.className}`}
                    style={{
                      fontWeight: 300,
                      fontSize: "clamp(28px, 3vw, 36px)",
                      color: C.stone,
                      textShadow: LP,
                      lineHeight: 1,
                    }}
                  >
                    {String(lesson.lesson_number).padStart(2, "0")}
                  </span>
                  {lesson.completed ? (
                    <span
                      className={`${inter.className} text-[10px] uppercase tracking-[0.3em]`}
                      style={{ color: C.stone, fontWeight: 600 }}
                    >
                      ✓
                    </span>
                  ) : null}
                </div>

                {/* Title + description */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <p
                      className={`${inter.className} text-[11px] uppercase tracking-[0.4em]`}
                      style={{ color: C.cream, fontWeight: 600 }}
                    >
                      {lesson.title}
                    </p>
                    {lesson.startHere ? (
                      <span
                        className={`${inter.className} text-[10px] uppercase tracking-[0.35em]`}
                        style={{ color: C.stone, fontWeight: 600 }}
                      >
                        Start here →
                      </span>
                    ) : null}
                  </div>
                  {lesson.description ? (
                    <p
                      className={`${inter.className} text-[13px] leading-[1.7]`}
                      style={{ color: C.muted, fontWeight: 300 }}
                    >
                      {lesson.description}
                    </p>
                  ) : null}
                </div>

                {/* Duration + open */}
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <span
                    className={`${inter.className} text-[10px] uppercase tracking-[0.4em]`}
                    style={{ color: C.muted, fontWeight: 600 }}
                  >
                    {formatLessonDuration(lesson.durationSeconds)}
                  </span>
                  <span
                    className={`${inter.className} text-[10px] uppercase tracking-[0.4em]`}
                    style={{ color: C.stone, fontWeight: 600 }}
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
