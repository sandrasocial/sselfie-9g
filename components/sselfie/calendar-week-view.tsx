"use client"

import type React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPillarTag } from "./content-pillar-tag"

interface CalendarWeekViewProps {
  currentWeek: Date
  posts: any[]
  onRefresh: () => void
  onWeekChange: (date: Date) => void
  children?: React.ReactNode
}

export function CalendarWeekView({ currentWeek, posts, onRefresh, onWeekChange, children }: CalendarWeekViewProps) {
  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

  // Calculate week dates
  const getWeekDates = (date: Date) => {
    const curr = new Date(date)
    const first = curr.getDate() - curr.getDay() + 1 // Monday
    const dates = []

    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i))
      dates.push(day)
    }

    return dates
  }

  const weekDates = getWeekDates(currentWeek)
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }
    const start = startDate.toLocaleDateString("en-US", options)
    const end = endDate.toLocaleDateString("en-US", options)
    const year = endDate.getFullYear()
    return `${start} - ${end}, ${year}`
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    onWeekChange(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    onWeekChange(newDate)
  }

  const goToToday = () => {
    onWeekChange(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const getPostsForDate = (date: Date) => {
    return posts.filter((post: any) => {
      if (!post.scheduled_at) return false
      const postDate = new Date(post.scheduled_at)
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation - Scandinavian minimal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-serif uppercase tracking-[0.2em] text-stone-400 mb-1">WEEK VIEW</h2>
          <p className="text-2xl font-light text-stone-900">{formatDateRange()}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs tracking-wider bg-transparent">
            TODAY
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextWeek} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
            {/* Assuming a refresh icon is used here */}
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h7.586a1 1 0 01.707.293l7.287 7.287a1 1 0 01-.293.707H19m-6-6H4"
              ></path>
            </svg>
          </Button>
        </div>
      </div>

      {/* Calendar Grid - Scandinavian aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {weekDates.map((date, index) => {
          const datePosts = getPostsForDate(date)

          return (
            <div
              key={index}
              className={`
                bg-white rounded-xl border transition-all
                ${isToday(date) ? "border-stone-950 shadow-sm" : "border-stone-100 hover:border-stone-200"}
              `}
            >
              {/* Day Header */}
              <div className="p-4 border-b border-stone-100">
                <div className="text-xs font-serif uppercase tracking-[0.15em] text-stone-400 mb-1">
                  {weekDays[index]}
                </div>
                <div className={`text-3xl font-light ${isToday(date) ? "text-stone-950" : "text-stone-300"}`}>
                  {date.getDate()}
                </div>
              </div>

              <div className="p-4 min-h-[200px] space-y-2">
                {datePosts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-stone-400">No posts</div>
                ) : (
                  datePosts.map((post: any) => (
                    <div key={post.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-stone-200">
                        <img
                          src={post.image_url || "/placeholder.svg?height=200&width=200"}
                          alt={post.caption || "Post"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-stone-600">{post.scheduled_time}</span>
                        {post.content_pillar && (
                          <div className="scale-75 origin-right">
                            <ContentPillarTag pillar={post.content_pillar} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
