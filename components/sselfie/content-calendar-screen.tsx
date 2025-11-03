"use client"

import { useState } from "react"
import useSWR from "swr"
import { CalendarWeekView } from "./calendar-week-view"
import { CalendarPostCard } from "./calendar-post-card"
import { ContentPillarTag } from "./content-pillar-tag"
import { Button } from "@/components/ui/button"
import { Plus, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { SchedulePostModal } from "./schedule-post-modal"
import UnifiedLoading from "./unified-loading"

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
}

export default function ContentCalendarScreen({ onNavigateToFeed }: ContentCalendarScreenProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)

  const { start, end } = getWeekRange(currentWeek)
  const { data, error, mutate } = useSWR(
    `/api/calendar/posts?startDate=${start.toISOString()}&endDate=${end.toISOString()}${selectedPillar ? `&pillar=${selectedPillar}` : ""}`,
    fetcher,
    { refreshInterval: 30000 },
  )

  const posts = data?.posts || []
  const isLoading = !error && !data

  const scheduledPosts = posts.filter((p: any) => p.scheduled_at)
  const unscheduledPosts = posts.filter((p: any) => !p.scheduled_at)

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

  const handleSchedule = async (postId: number, scheduledAt: string, scheduledTime: string, contentPillar: string) => {
    try {
      const response = await fetch("/api/calendar/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          scheduledAt,
          scheduledTime,
          contentPillar,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!response.ok) throw new Error("Failed to schedule post")

      await mutate()
    } catch (error) {
      console.error("Error scheduling post:", error)
      throw error
    }
  }

  const openScheduleModal = (post: any) => {
    setSelectedPost(post)
    setScheduleModalOpen(true)
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
    const { start, end } = getWeekRange(currentWeek)
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

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-serif uppercase tracking-[0.2em] text-stone-400 mb-2">CONTENT CALENDAR</h1>
              <p className="text-stone-600">Plan and schedule your Instagram content</p>
            </div>

            <Button className="gap-2" onClick={onNavigateToFeed}>
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-stone-400" />
                <span className="font-medium text-stone-950">{formatWeekDisplay()}</span>
              </div>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
          </div>

          {/* Pillar Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filter by pillar:</span>
            </div>
            <Button
              variant={selectedPillar === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPillar(null)}
              className="text-xs"
            >
              All
            </Button>
            {["education", "inspiration", "personal", "promotion"].map((pillar) => (
              <button
                key={pillar}
                onClick={() => setSelectedPillar(pillar === selectedPillar ? null : pillar)}
                className={selectedPillar === pillar ? "opacity-100" : "opacity-60 hover:opacity-100"}
              >
                <ContentPillarTag pillar={pillar as any} />
              </button>
            ))}
          </div>

          {isLoading ? (
            <UnifiedLoading message="Loading calendar..." />
          ) : error ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-600">Failed to load calendar</p>
                <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <>
              {unscheduledPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-serif uppercase tracking-[0.2em] text-stone-400">
                      UNSCHEDULED POSTS ({unscheduledPosts.length})
                    </h2>
                    <p className="text-xs text-stone-500">Click a post to schedule it</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {unscheduledPosts.map((post: any) => (
                      <button
                        key={post.id}
                        onClick={() => openScheduleModal(post)}
                        className="group relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-stone-200 hover:border-stone-950 transition-all"
                      >
                        <img
                          src={post.image_url || "/placeholder.svg?height=400&width=400"}
                          alt={post.caption || "Post"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2">
                            <Calendar className="w-5 h-5 text-stone-950" />
                          </div>
                        </div>
                        {post.content_pillar && (
                          <div className="absolute bottom-2 left-2">
                            <ContentPillarTag pillar={post.content_pillar} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <CalendarWeekView currentWeek={currentWeek} posts={scheduledPosts} onRefresh={mutate} />

              <div className="space-y-6">
                <h2 className="text-sm font-serif uppercase tracking-[0.2em] text-stone-400">SCHEDULED POSTS</h2>

                {scheduledPosts.length === 0 ? (
                  <div className="text-center py-16 space-y-4 rounded-xl border border-dashed border-stone-200 bg-white">
                    <Calendar className="w-16 h-16 mx-auto text-stone-300" />
                    <h3 className="text-xl font-light text-stone-900">No posts scheduled yet</h3>
                    <p className="text-stone-600 max-w-md mx-auto">
                      {unscheduledPosts.length > 0
                        ? "Click on an unscheduled post above to add it to your calendar"
                        : "Start planning your Instagram content by creating your first post in the Feed Designer"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduledPosts.map((post: any) => (
                      <CalendarPostCard
                        key={post.id}
                        post={post}
                        onRefresh={mutate}
                        onScheduleClick={() => openScheduleModal(post)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedPost && (
        <SchedulePostModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          post={selectedPost}
          onSchedule={handleSchedule}
        />
      )}
    </div>
  )
}
