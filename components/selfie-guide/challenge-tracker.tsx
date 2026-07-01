"use client"

import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

const CHALLENGE_DAYS = [
  {
    day: 1,
    title: "Window Light Selfie",
    task: "Take one selfie using natural window light. No ring light. Use your settings from Part 1. Take at least 10 shots.",
    image: "/images/selfie-guide/sg-challenge-03.png",
  },
  {
    day: 2,
    title: "Rule of Thirds",
    task: "Turn on your camera grid. Frame your eyes on the top third line. Take 5 shots. Notice how differently your face reads.",
    image: "/images/selfie-guide/sg-challenge-01.png",
  },
  {
    day: 3,
    title: "High Angle Test",
    task: "Hold your phone 15 degrees above eye level. Tilt your chin down slightly. Take 3 shots and compare to your Day 2 photos.",
    image: "/images/selfie-guide/sg-challenge-05.png",
  },
  {
    day: 4,
    title: "Editing Pass",
    task: "Take your best selfie from Days 1–3. Open Lightroom Mobile. Apply the 5-step edit from Part 4. Save and compare to the original.",
    image: "/images/selfie-guide/sg-challenge-06.png",
  },
  {
    day: 5,
    title: "Mirror or Car",
    task: "Try either a mirror selfie or a car selfie using the techniques from this guide. Take at least 10 shots.",
    image: "/images/selfie-guide/sg-challenge-02.png",
  },
  {
    day: 6,
    title: "Caption Writing",
    task: "Write 3 captions for your Day 5 photo: one short (under 10 words), one medium (2–3 sentences), one long (5–8 sentences). Notice which feels most like you.",
    image: "/images/selfie-guide/sg-challenge-07.png",
  },
  {
    day: 7,
    title: "Post It",
    task: "Choose your best selfie from this week. Pick your favorite caption. Post it. Done. You don't need permission.",
    image: "/images/selfie-guide/sg-challenge-04.png",
  },
]

type ChallengeTrackerProps = {
  completedDays: number[]
  onDayComplete: (day: number) => void
  onChallengeComplete?: (completedDays: number[]) => void
}

export default function ChallengeTracker({
  completedDays,
  onDayComplete,
  onChallengeComplete,
}: ChallengeTrackerProps) {
  const allDone = CHALLENGE_DAYS.every((d) => completedDays.includes(d.day))

  function handleDayComplete(day: number) {
    if (completedDays.includes(day)) return
    const nextCompletedDays = [...completedDays, day].sort((a, b) => a - b)
    onDayComplete(day)
    if (nextCompletedDays.length === CHALLENGE_DAYS.length && onChallengeComplete) {
      onChallengeComplete(nextCompletedDays)
    }
  }

  return (
    <div className={inter.className} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {CHALLENGE_DAYS.map((item) => {
        const isCompleted = completedDays.includes(item.day)
        // Sequential unlock: day N unlocks when day N-1 is done (Day 1 always unlocked)
        const isUnlocked = item.day === 1 || completedDays.includes(item.day - 1) || isCompleted

        return (
          <div
            key={item.day}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              padding: "18px 20px",
              background: isCompleted
                ? "rgba(240,237,232,0.05)"
                : "rgba(28,27,25,0.8)",
              border: "1px solid",
              borderColor: isCompleted
                ? "rgba(240,237,232,0.2)"
                : "rgba(168,164,156,0.14)",
              borderRadius: "3px",
              opacity: isUnlocked ? 1 : 0.4,
              transition: "opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease",
            }}
          >
            {/* Day number */}
            <div
              style={{
                flexShrink: 0,
                minWidth: "40px",
              }}
            >
              <span
                className={cormorant.className}
                style={{
                  display: "block",
                  fontSize: "28px",
                  fontWeight: 300,
                  lineHeight: 1,
                  color: isCompleted ? "rgba(240,237,232,0.5)" : "#f0ede8",
                }}
              >
                {String(item.day).padStart(2, "0")}
              </span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: isCompleted ? "rgba(240,237,232,0.5)" : "#f0ede8",
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  color: "rgba(200,196,187,0.85)",
                }}
              >
                {item.task}
              </p>
            </div>

            {/* Thumbnail */}
            <div
              style={{
                flexShrink: 0,
                width: "72px",
                height: "90px",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
                opacity: isCompleted ? 0.4 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              <Image
                src={item.image}
                alt={`Day ${item.day} — ${item.title}`}
                fill
                sizes="72px"
                style={{ objectFit: "cover", objectPosition: "top center" }}
              />
            </div>

            {/* Checkbox */}
            {isUnlocked && (
              <button
                type="button"
                onClick={() => {
                  if (!isCompleted) handleDayComplete(item.day)
                }}
                aria-pressed={isCompleted}
                aria-label={`Mark Day ${item.day} as ${isCompleted ? "complete" : "done"}`}
                style={{
                  flexShrink: 0,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: isCompleted
                    ? "1px solid rgba(240,237,232,0.5)"
                    : "1px solid rgba(168,164,156,0.4)",
                  background: isCompleted ? "rgba(240,237,232,0.15)" : "transparent",
                  cursor: isCompleted ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "2px",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                  color: "#f0ede8",
                  fontSize: "11px",
                }}
              >
                {isCompleted ? "✓" : ""}
              </button>
            )}
          </div>
        )
      })}

      {/* Completion card */}
      {allDone && (
        <div
          style={{
            marginTop: "16px",
            padding: "28px 24px",
            background: "rgba(240,237,232,0.04)",
            border: "1px solid rgba(240,237,232,0.2)",
            borderRadius: "3px",
            textAlign: "center",
          }}
        >
          <p
            className={cormorant.className}
            style={{
              margin: "0 0 8px",
              fontSize: "26px",
              fontWeight: 300,
              letterSpacing: "0.02em",
              color: "#f0ede8",
            }}
          >
            You finished the challenge.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 300,
              lineHeight: 1.7,
              color: "rgba(200,196,187,0.8)",
            }}
          >
            Seven days. Seven selfies. That&apos;s more than most people will do all year. You know what to do next.
          </p>
        </div>
      )}
    </div>
  )
}
