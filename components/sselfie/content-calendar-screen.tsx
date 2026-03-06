"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Clock, MoreHorizontal, Plus, ImageIcon } from "lucide-react"
import UnifiedLoading from "./unified-loading"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getWeekRange(date: Date) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay()) // Start on Sunday
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6) // End on Saturday
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

interface ContentCalendarScreenProps {
  onNavigateToFeed?: () => void
  userId?: string
}

export default function ContentCalendarScreen({ onNavigateToFeed, userId }: ContentCalendarScreenProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const { start, end } = getWeekRange(currentWeek)
  const { data, error, mutate } = useSWR(
    `/api/calendar/posts?startDate=${start.toISOString()}&endDate=${end.toISOString()}${userId ? `&userId=${userId}` : ""}`,
    fetcher,
    { refreshInterval: 10000 },
  )

  const posts = data?.posts || []
  const isLoading = !error && !data

  const scheduledPosts = posts.filter((p: any) => p.scheduled_at)

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    return day
  })

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter((post: any) => {
      const postDate = new Date(post.scheduled_at)
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const formatWeekDisplay = () => {
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })
    const startDay = start.getDate()
    const endDay = end.getDate()
    const year = end.getFullYear()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return

    try {
      const response = await fetch("/api/calendar/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) throw new Error("Failed to delete post")
      await mutate()
    } catch (error) {
      console.error("Error deleting post:", error)
      alert("Failed to delete post")
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#0d0c0b]">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-[rgba(175,170,162,0.08)] backdrop-blur-[50px] border-b border-[rgba(195,190,182,0.15)] px-4 py-3 -mx-4 md:-mx-6">
            <div>
              <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780] mb-1">Content Calendar</p>
              <p className="text-sm text-[#8a8780]">Schedule and manage your posts</p>
            </div>

            {onNavigateToFeed && (
              <Button onClick={onNavigateToFeed} size="sm" className="gap-2 bg-[#c8c4bb] text-[#0d0c0b] hover:bg-[#f0ede8] border-0 rounded-full text-xs font-medium tracking-[0.15em] uppercase">
                <Plus className="w-4 h-4" />
                New Post
              </Button>
            )}
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between border-y border-[rgba(195,190,182,0.15)] py-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goToPreviousWeek} className="h-8 w-8 p-0 text-[#a8a49c] hover:text-[#f0ede8] hover:bg-[rgba(175,170,162,0.10)]">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[200px] justify-center">
                <Calendar className="h-4 w-4 text-[#8a8780]" />
                <span className="font-medium text-[#f0ede8] text-sm">{formatWeekDisplay()}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={goToNextWeek} className="h-8 w-8 p-0 text-[#a8a49c] hover:text-[#f0ede8] hover:bg-[rgba(175,170,162,0.10)]">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs bg-[rgba(175,170,162,0.10)] border-[rgba(195,190,182,0.25)] text-[#a8a49c] hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] rounded-full tracking-[0.15em] uppercase">
              Today
            </Button>
          </div>

          {isLoading ? (
            <UnifiedLoading message="Loading calendar..." />
          ) : error ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-sm text-[#8a8780]">Failed to load calendar</p>
                <Button variant="outline" size="sm" onClick={() => mutate()} className="bg-[rgba(175,170,162,0.10)] border-[rgba(195,190,182,0.25)] text-[#a8a49c] hover:bg-[rgba(175,170,162,0.18)] rounded-full text-xs uppercase tracking-[0.15em]">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Weekly Grid */}
              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {weekDays.map((day, index) => {
                  const dayPosts = getPostsForDate(day)
                  const today = isToday(day)

                  return (
                    <div
                      key={index}
                      className={`bg-[rgba(175,170,162,0.04)] rounded-xl border min-h-[300px] flex flex-col ${
                        today ? "border-[#a8a49c]" : "border-[rgba(195,190,182,0.10)]"
                      }`}
                    >
                      {/* Day Header */}
                      <div
                        className={`p-2 md:p-3 border-b ${today ? "border-[#a8a49c] bg-[rgba(168,164,156,0.08)]" : "border-[rgba(195,190,182,0.10)]"}`}
                      >
                        <div className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-[#8a8780] font-medium">
                          {day.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div
                          className={`text-lg md:text-xl font-light ${today ? "text-[#f0ede8]" : "text-[#8a8780]"}`}
                        >
                          {day.getDate()}
                        </div>
                      </div>

                      {/* Posts for this day */}
                      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                        {dayPosts.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center opacity-30">
                              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-[#8a8780]" />
                              <p className="text-[10px] text-[#8a8780]">No posts</p>
                            </div>
                          </div>
                        ) : (
                          dayPosts.map((post: any) => (
                            <div
                              key={post.id}
                              className="group relative bg-[rgba(175,170,162,0.12)] border border-[rgba(195,190,182,0.15)] rounded-lg overflow-hidden hover:border-[rgba(195,190,182,0.30)] transition-colors"
                            >
                              {/* Post Image/Preview */}
                              {post.image_url ? (
                                <div className="aspect-square relative overflow-hidden">
                                  <img
                                    src={post.image_url || "/placeholder.svg"}
                                    alt={post.caption || "Post"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-square bg-[rgba(175,170,162,0.08)] flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-[#8a8780]" />
                                </div>
                              )}

                              {/* Post Info */}
                              <div className="p-2 space-y-1">
                                {post.scheduled_time && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#8a8780]">
                                    <Clock className="w-3 h-3" />
                                    {post.scheduled_time}
                                  </div>
                                )}
                                {post.caption && (
                                  <p className="text-[10px] text-[#a8a49c] line-clamp-2 leading-relaxed">
                                    {post.caption}
                                  </p>
                                )}
                                {post.content_pillar && (
                                  <div className="inline-block">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[rgba(168,164,156,0.15)] text-[#a8a49c] uppercase tracking-wider font-medium">
                                      {post.content_pillar}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 bg-[rgba(175,170,162,0.20)] hover:bg-[rgba(175,170,162,0.35)] text-[#f0ede8]"
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleDeletePost(post.id)}
                                      className="text-red-400"
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Empty State */}
              {scheduledPosts.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <Calendar className="w-12 h-12 mx-auto text-[#8a8780]" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-['Cormorant_Garamond'] font-light text-[#f0ede8]">No posts scheduled</h3>
                    <p className="text-sm text-[#8a8780] max-w-md mx-auto">
                      Start planning your content by asking the Content Creator agent to generate a calendar
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { ContentCalendarScreen }
export type { ContentCalendarScreenProps }
