"use client"

import { useCallback, useEffect, useState } from "react"

import { toast } from "@/hooks/use-toast"

type TodayPost = {
  id: number
  feedId: number
  caption: string
  contentPillar: string | null
  imageUrl: string
  scheduledAt: string
  isToday: boolean
}

type TodayResponse = {
  enabled: boolean
  post: TodayPost | null
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(
    new Date(value),
  )
}

export function CalendarTodayStrip() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [busy, setBusy] = useState<"download" | "copy" | "posted" | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/feed-planner/today", { credentials: "include" })
      if (!response.ok) return
      setData((await response.json()) as TodayResponse)
    } catch {
      // This strip is an enhancement. The existing calendar remains usable if it cannot load.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!data?.enabled) return null

  if (!data.post) {
    return (
      <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6">
        <div className="rounded-[14px] border border-border/50 bg-card px-5 py-4 shadow-sm">
          {/* DRAFT copy for Sandra approval before the flag is enabled. */}
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Today</p>
          <p className="mt-2 font-serif text-[20px] font-light text-foreground">Nothing ready today</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Your next ready post will appear here.
          </p>
        </div>
      </div>
    )
  }

  const post = data.post

  const download = async () => {
    setBusy("download")
    try {
      const response = await fetch(post.imageUrl)
      if (!response.ok) throw new Error("download_failed")
      const blob = await response.blob()
      const file = new File([blob], `sselfie-calendar-${post.id}.png`, {
        type: blob.type || "image/png",
      })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "SSELFIE calendar" })
      } else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = file.name
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      toast({ title: "Download failed", description: "Please try again", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const copyCaption = async () => {
    setBusy("copy")
    try {
      await navigator.clipboard.writeText(post.caption)
      toast({ title: "Copied", description: "Caption copied to clipboard" })
    } catch {
      toast({ title: "Copy failed", description: "Please try again", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const markPosted = async () => {
    setBusy("posted")
    try {
      const response = await fetch(`/api/feed/${post.feedId}/mark-posted`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, isPosted: true }),
      })
      if (!response.ok) throw new Error("mark_failed")
      toast({ title: "Marked as posted" })
      await load()
    } catch {
      toast({ title: "Could not update post", description: "Please try again", variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-3 pt-4 sm:px-6" aria-label="Today's calendar post">
      <div className="overflow-hidden rounded-[14px] border border-border/50 bg-card shadow-sm">
        <div className="grid gap-0 sm:grid-cols-[minmax(180px,280px)_1fr]">
          <div className="aspect-[4/5] bg-muted sm:aspect-auto sm:min-h-[280px]">
            {/* Generated customer asset; plain img avoids remote-host configuration drift. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              alt={`Calendar image for ${formatDay(post.scheduledAt)}`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col p-5 sm:p-7">
            {/* DRAFT copy for Sandra approval before the flag is enabled. */}
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {post.isToday ? "Today" : "Next ready post"}
            </p>
            <h2 className="mt-2 font-serif text-[24px] font-light leading-tight text-foreground">
              {formatDay(post.scheduledAt)}
            </h2>
            {post.contentPillar && (
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {post.contentPillar}
              </p>
            )}
            <p className="mt-4 max-h-36 overflow-y-auto whitespace-pre-wrap pr-2 text-[14px] leading-relaxed text-muted-foreground">
              {post.caption}
            </p>
            <div className="mt-6 grid gap-2 sm:mt-auto sm:grid-cols-3">
              <button
                type="button"
                onClick={download}
                disabled={busy !== null}
                className="min-h-11 rounded-[4px] border border-border px-4 text-[10px] uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {busy === "download" ? "Saving" : "Download"}
              </button>
              <button
                type="button"
                onClick={copyCaption}
                disabled={busy !== null || !post.caption}
                className="min-h-11 rounded-[4px] border border-border px-4 text-[10px] uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {busy === "copy" ? "Copying" : "Copy caption"}
              </button>
              <button
                type="button"
                onClick={markPosted}
                disabled={busy !== null}
                className="min-h-11 rounded-[4px] bg-foreground px-4 text-[10px] uppercase tracking-[0.16em] text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {busy === "posted" ? "Updating" : "Mark as posted"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
