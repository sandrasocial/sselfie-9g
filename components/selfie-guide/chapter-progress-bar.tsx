"use client"

import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], weight: ["400", "500"] })

type ChapterProgressBarProps = {
  currentIndex: number
  totalChapters: number
  currentTitle: string
  completedChapters: number[]
}

export default function ChapterProgressBar({
  currentIndex,
  totalChapters,
  currentTitle,
  completedChapters,
}: ChapterProgressBarProps) {
  return (
    <div
      className={inter.className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
      }}
    >
      {/* Segments row */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {Array.from({ length: totalChapters }).map((_, i) => {
          const isCompleted = completedChapters.includes(i)
          const isCurrent = i === currentIndex
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "3px",
                borderRadius: "999px",
                backgroundColor: isCompleted
                  ? "#f0ede8"
                  : isCurrent
                    ? "rgba(240,237,232,0.55)"
                    : "rgba(240,237,232,0.15)",
                transition: "background-color 0.2s ease",
                position: "relative",
              }}
            >
              {isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    inset: "-2px",
                    borderRadius: "999px",
                    border: "1px solid rgba(240,237,232,0.28)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Chapter title below */}
      <p
        style={{
          margin: 0,
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(240,237,232,0.6)",
          lineHeight: 1,
        }}
      >
        {currentTitle}
      </p>
    </div>
  )
}
