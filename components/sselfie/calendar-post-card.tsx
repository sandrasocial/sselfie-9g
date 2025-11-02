"use client"

import InstagramPhotoCard from "./instagram-photo-card"
import InstagramReelCard from "./instagram-reel-card"
import { ContentPillarTag } from "./content-pillar-tag"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalendarPostCardProps {
  post: any
  onRefresh: () => void
  onScheduleClick?: () => void
}

export function CalendarPostCard({ post, onRefresh, onScheduleClick }: CalendarPostCardProps) {
  const statusColors = {
    draft: "bg-stone-100 text-stone-600",
    scheduled: "bg-blue-50 text-blue-700",
    posted: "bg-green-50 text-green-700",
  }

  const mockConcept = {
    title: post.caption?.slice(0, 50) || "Untitled",
    description: post.caption || "",
    category: post.content_pillar || "education",
  }

  const handleMarkAsPosted = async () => {
    try {
      const response = await fetch("/api/calendar/mark-posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      })

      if (!response.ok) throw new Error("Failed to mark as posted")

      onRefresh()
    } catch (error) {
      console.error("Error marking as posted:", error)
    }
  }

  return (
    <div className="group relative">
      {/* Scheduling Badge */}
      <div className="absolute -top-2 -right-2 z-10 flex flex-col gap-1">
        {post.scheduled_time && (
          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full shadow-sm border border-stone-200 text-xs font-medium">
            <Clock className="w-3 h-3 text-stone-500" />
            <span className="text-stone-700">{post.scheduled_time}</span>
          </div>
        )}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[post.post_status || "draft"]}`}>
          {(post.post_status || "draft").charAt(0).toUpperCase() + (post.post_status || "draft").slice(1)}
        </div>
      </div>

      {/* Instagram Card */}
      <div className="scale-90 origin-top">
        {post.post_type === "reel" ? (
          <InstagramReelCard
            videoUrl={post.image_url || "/placeholder.svg?height=400&width=400"}
            motionPrompt={post.caption || ""}
          />
        ) : (
          <InstagramPhotoCard
            concept={mockConcept}
            imageUrl={post.image_url || "/placeholder.svg?height=400&width=400"}
            imageId={String(post.id)}
            onFavoriteToggle={() => {}}
            onDelete={() => {}}
            isFavorite={false}
          />
        )}
      </div>

      {/* Content Pillar Tag */}
      {post.content_pillar && (
        <div className="mt-2 flex justify-center">
          <ContentPillarTag pillar={post.content_pillar} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {post.post_status === "scheduled" && (
          <Button size="sm" variant="outline" onClick={handleMarkAsPosted} className="flex-1 text-xs bg-transparent">
            Mark as Posted
          </Button>
        )}
        {onScheduleClick && (
          <Button size="sm" variant="outline" onClick={onScheduleClick} className="flex-1 text-xs bg-transparent">
            Reschedule
          </Button>
        )}
      </div>
    </div>
  )
}
