"use client"

import { useState } from "react"

import VideoPlayer from "@/components/academy/video-player"
import type { StarterKitEditingMasterclassLesson } from "@/lib/academy/starter-kit-editing-masterclass"

type StarterKitEditingMasterclassVideosProps = {
  lessons: StarterKitEditingMasterclassLesson[]
}

const C = {
  ink: "#0F0D0B",
  cream: "#EDE9E2",
  creamWarm: "#F4F0E6",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(15,13,11,0.14)",
}

export function StarterKitEditingMasterclassVideos({
  lessons,
}: StarterKitEditingMasterclassVideosProps) {
  const [activeLessonId, setActiveLessonId] = useState(lessons[0]?.id ?? null)
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0]

  if (!activeLesson) {
    return (
      <section className="p-8 md:p-10" style={{ background: C.creamWarm, border: `1px solid ${C.div}` }}>
        <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
          Editing Masterclass
        </p>
        <p className="mt-4 text-[14px] leading-[1.7]" style={{ color: C.ink }}>
          The editing videos are being connected.
        </p>
      </section>
    )
  }

  return (
    <section className="p-8 md:p-10" style={{ background: C.creamWarm, border: `1px solid ${C.div}` }}>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.72fr)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.muted, fontWeight: 600 }}>
            Editing Masterclass
          </p>
          <h2
            className="mt-5 font-serif uppercase"
            style={{
              color: C.ink,
              fontWeight: 300,
              fontSize: "clamp(30px, 5vw, 54px)",
              lineHeight: 1.04,
              textShadow: "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09)",
            }}
          >
            Watch the full editing course
          </h2>
          <p className="mt-5 max-w-2xl text-[14px] leading-[1.78]" style={{ color: "#3D3830" }}>
            Start with the first lesson, or jump straight to the app you are using today. Maya can help you apply the steps below.
          </p>
        </div>

        <div className="space-y-2">
          {lessons.map((lesson) => {
            const isActive = lesson.id === activeLesson.id

            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setActiveLessonId(lesson.id)}
                className="grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 p-4 text-left transition-opacity hover:opacity-85"
                style={{
                  background: isActive ? C.ink : C.cream,
                  color: isActive ? C.creamWarm : C.ink,
                  border: `1px solid ${isActive ? C.ink : C.div}`,
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: isActive ? C.stone : C.muted, fontWeight: 600 }}
                >
                  {String(lesson.lessonNumber).padStart(2, "0")}
                </span>
                <span className="text-[12px] uppercase tracking-[0.2em]" style={{ fontWeight: 600 }}>
                  {lesson.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.36em]" style={{ color: C.muted, fontWeight: 600 }}>
              Lesson {String(activeLesson.lessonNumber).padStart(2, "0")}
            </p>
            <h3
              className="mt-2 font-serif uppercase"
              style={{
                color: C.ink,
                fontWeight: 300,
                fontSize: "clamp(24px, 3vw, 36px)",
                lineHeight: 1.06,
              }}
            >
              {activeLesson.title}
            </h3>
          </div>
          {activeLesson.durationMinutes ? (
            <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.muted, fontWeight: 600 }}>
              {activeLesson.durationMinutes} minutes
            </p>
          ) : null}
        </div>

        <VideoPlayer
          key={activeLesson.id}
          videoUrl={activeLesson.videoUrl}
          lessonId={activeLesson.id}
          durationMinutes={activeLesson.durationMinutes || undefined}
        />
      </div>
    </section>
  )
}
