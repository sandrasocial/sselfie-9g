"use client"

import { useState } from "react"
import { getContentCalendar, type ContentCalendar } from "@/lib/feed-planner/content-calendar"

/**
 * Content Calendar Component for Free Feed Planner Users
 * 
 * Shows 30-day content calendar organized by weeks
 * Allows users to navigate between weeks
 */
export default function FeedContentCalendar() {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const calendar: ContentCalendar = getContentCalendar()

  const weekKey = `week${selectedWeek}` as keyof ContentCalendar
  const currentWeek = calendar[weekKey]

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2
            style={{ fontFamily: "'Times New Roman', serif" }}
            className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
          >
            Your 30-Day Content Plan
          </h2>
          <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto px-4">
            No more &quot;what should I post today?&quot; moments. Here&apos;s your whole month planned out—just show up and create!
          </p>
        </div>

        {/* Week Selector */}
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {[1, 2, 3, 4, 5].map((week) => (
            <button
              key={week}
              onClick={() => setSelectedWeek(week)}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-xs tracking-wider uppercase whitespace-nowrap border transition-all duration-200 shrink-0 ${
                selectedWeek === week
                  ? "border-stone-950 bg-stone-950 text-stone-50"
                  : "border-stone-300 text-stone-700 hover:border-stone-950"
              }`}
            >
              Week {week}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
          {currentWeek.map((post) => (
            <div key={post.day} className="bg-white border border-stone-200 p-4 sm:p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-500">
                  Day {post.day}
                </span>
                <span
                  className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full ${
                    post.type === "selfie" ? "bg-stone-950 text-stone-50" : "bg-stone-200 text-stone-950"
                  }`}
                >
                  {post.type}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-medium tracking-wide text-stone-950 mb-2">
                {post.title}
              </h3>
              <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">{post.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
