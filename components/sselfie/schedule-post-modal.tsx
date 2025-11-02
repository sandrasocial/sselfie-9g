"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ContentPillarTag } from "./content-pillar-tag"
import { Calendar, Clock } from "lucide-react"

interface SchedulePostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: {
    id: number
    feed_id?: number
    feedId?: number
    post_type?: string
    postType?: "photo" | "reel" | "carousel"
    image_url?: string | null
    imageUrl?: string | null
    caption: string
    scheduled_at?: Date | null
    scheduledAt?: Date | null
    scheduled_time?: string
    scheduledTime?: string
    content_pillar?: string | null
    contentPillar?: string | null
    status: string
    position: number
    prompt?: string
  }
  onSchedule: (postId: number, scheduledAt: string, scheduledTime: string, contentPillar: string) => Promise<void>
}

const TIME_OPTIONS = [
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
]

const PILLARS = ["education", "inspiration", "personal", "promotion"] as const

export default function SchedulePostModal({ open, onOpenChange, post, onSchedule }: SchedulePostModalProps) {
  const scheduledAt = post.scheduled_at || post.scheduledAt
  const scheduledTime = post.scheduled_time || post.scheduledTime || "9:00 AM"
  const contentPillar = post.content_pillar || post.contentPillar || "education"
  const imageUrl = post.image_url || post.imageUrl

  const [selectedDate, setSelectedDate] = useState<string>(
    scheduledAt ? new Date(scheduledAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  )
  const [selectedTime, setSelectedTime] = useState<string>(scheduledTime)
  const [selectedPillar, setSelectedPillar] = useState<string>(contentPillar)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) return

    setIsSubmitting(true)
    try {
      const dateTime = new Date(`${selectedDate}T${convertTo24Hour(selectedTime)}`)

      await onSchedule(post.id, dateTime.toISOString(), selectedTime, selectedPillar)

      onOpenChange(false)
    } catch (error) {
      console.error("Failed to schedule post:", error)
      alert("Failed to schedule post. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const convertTo24Hour = (time12h: string) => {
    const [time, modifier] = time12h.split(" ")
    let [hours, minutes] = time.split(":")
    if (hours === "12") {
      hours = modifier === "AM" ? "00" : "12"
    } else if (modifier === "PM") {
      hours = String(Number.parseInt(hours, 10) + 12)
    }
    return `${hours.padStart(2, "0")}:${minutes}:00`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif uppercase tracking-[0.2em] text-sm text-stone-400">
            Schedule Post
          </DialogTitle>
          <DialogDescription className="text-stone-600">
            Choose when you want to post this content to Instagram
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Clock className="w-4 h-4" />
              Time
            </Label>
            <select
              id="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950"
            >
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Content Pillar Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-stone-700">Content Pillar</Label>
            <div className="flex flex-wrap gap-2">
              {PILLARS.map((pillar) => (
                <button
                  key={pillar}
                  onClick={() => setSelectedPillar(pillar)}
                  className={`transition-opacity ${
                    selectedPillar === pillar
                      ? "opacity-100 ring-2 ring-stone-950 ring-offset-2"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <ContentPillarTag pillar={pillar} />
                </button>
              ))}
            </div>
          </div>

          {/* Post Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-stone-700">Preview</Label>
              <div className="relative aspect-square w-full max-w-[200px] rounded-lg overflow-hidden border border-stone-200">
                <img src={imageUrl || "/placeholder.svg"} alt="Post preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { SchedulePostModal }
