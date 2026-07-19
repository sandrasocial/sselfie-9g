"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { toast } from "@/hooks/use-toast"

interface Highlight {
  id?: number
  title: string
  image_url: string | null
  icon_style?: string
  prompt?: string | null
}

interface GalleryAsset {
  id: string
  kind: "image" | "video"
  url: string
  thumbnailUrl?: string | null
}

interface StorySequence {
  key: string
  id?: number
  title: string
  slides: string[]
  coverUrl: string | null
  coverStyle: "photo" | "type" | "detail"
  freshnessNote: string
}

interface FeedHighlightsModalProps {
  feedId: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void | Promise<void>
  existingHighlights?: Highlight[]
  brandColors?: string[]
  initialHighlightId?: number | null
  initialSequenceTitle?: string | null
  onCreateWithMaya?: (title: string, coverOnly?: boolean) => void
}

const DEFAULT_NOTE =
  "Keep this fresh by replacing the oldest slide when your offer, story or results change."

function newSequence(index: number, title = ""): StorySequence {
  return {
    key: `new-${Date.now()}-${index}`,
    title,
    slides: [],
    coverUrl: null,
    coverStyle: "photo",
    freshnessNote: DEFAULT_NOTE,
  }
}

function parseSequence(highlight: Highlight, index: number): StorySequence {
  let parsed: Partial<StorySequence> = {}
  try {
    parsed = highlight.prompt ? JSON.parse(highlight.prompt) : {}
  } catch {
    parsed = {}
  }
  const fallbackImage =
    highlight.image_url && !highlight.image_url.startsWith("#") ? [highlight.image_url] : []
  return {
    key: highlight.id ? `saved-${highlight.id}` : `saved-${index}`,
    id: highlight.id,
    title: highlight.title || "",
    slides: Array.isArray(parsed.slides)
      ? parsed.slides.filter(
          (item): item is string => typeof item === "string" && item.startsWith("http")
        )
      : fallbackImage,
    coverUrl:
      typeof parsed.coverUrl === "string"
        ? parsed.coverUrl
        : highlight.image_url && !highlight.image_url.startsWith("#")
          ? highlight.image_url
          : null,
    coverStyle:
      parsed.coverStyle === "type" || parsed.coverStyle === "detail" ? parsed.coverStyle : "photo",
    freshnessNote:
      typeof parsed.freshnessNote === "string" && parsed.freshnessNote.trim()
        ? parsed.freshnessNote
        : DEFAULT_NOTE,
  }
}

export default function FeedHighlightsModal({
  feedId,
  isOpen,
  onClose,
  onSave,
  existingHighlights = [],
  initialHighlightId = null,
  initialSequenceTitle = null,
  onCreateWithMaya,
}: FeedHighlightsModalProps) {
  const [sequences, setSequences] = useState<StorySequence[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [gallery, setGallery] = useState<GalleryAsset[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)

  useEffect(() => setPortalTarget(document.body), [])

  useEffect(() => {
    if (!isOpen) return
    const restored = existingHighlights.map(parseSequence)
    const startingTitle = initialSequenceTitle?.trim() || ""
    const available =
      restored.length === 0 && startingTitle ? [newSequence(0, startingTitle)] : restored
    setSequences(available)
    const requested = available.find(sequence => sequence.id === initialHighlightId)
    setSelectedKey(requested?.key ?? available[0]?.key ?? null)
    setPreviewIndex(0)

    let active = true
    fetch("/api/app-v3/gallery", { credentials: "include" })
      .then(response => (response.ok ? response.json() : { assets: [] }))
      .then(data => {
        if (!active) return
        setGallery(
          (Array.isArray(data?.assets) ? data.assets : []).filter(
            (asset: GalleryAsset) => asset?.kind === "image" && typeof asset.url === "string"
          )
        )
      })
      .catch(() => active && setGallery([]))
    void trackAnalyticsEvent({ event: "story_studio_opened", properties: { feedId } })
    return () => {
      active = false
    }
  }, [existingHighlights, feedId, initialHighlightId, initialSequenceTitle, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, isSaving, onClose])

  const selected = useMemo(
    () => sequences.find(sequence => sequence.key === selectedKey) ?? null,
    [selectedKey, sequences]
  )

  const updateSelected = (change: Partial<StorySequence>) => {
    if (!selectedKey) return
    setSequences(current =>
      current.map(sequence =>
        sequence.key === selectedKey ? { ...sequence, ...change } : sequence
      )
    )
  }

  const addSequence = () => {
    const sequence = newSequence(Date.now())
    setSequences(current => [...current, sequence])
    setSelectedKey(sequence.key)
    setPreviewIndex(0)
  }

  const addSlide = (url: string) => {
    if (!selected) return
    if (selected.slides.includes(url)) {
      updateSelected({ slides: selected.slides.filter(slide => slide !== url) })
      return
    }
    updateSelected({
      slides: [...selected.slides, url],
      coverUrl: selected.coverUrl ?? url,
    })
  }

  const save = async () => {
    if (isSaving) return
    const invalid = sequences.find(sequence => !sequence.title.trim())
    if (invalid) {
      setSelectedKey(invalid.key)
      toast({ title: "Give this sequence a name", description: "A short title is enough." })
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          highlights: sequences.map(sequence => ({
            title: sequence.title.trim(),
            coverUrl: sequence.coverUrl || sequence.slides[0] || "#F1F2F2",
            type: sequence.coverUrl || sequence.slides[0] ? "image" : "type",
            description: JSON.stringify({
              version: 1,
              slides: sequence.slides,
              coverUrl: sequence.coverUrl,
              coverStyle: sequence.coverStyle,
              freshnessNote: sequence.freshnessNote,
            }),
          })),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Could not save your Story Studio")
      await onSave()
      void trackAnalyticsEvent({
        event: "story_studio_saved",
        properties: { feedId, sequenceCount: sequences.length },
      })
      toast({
        title: "Story Studio saved",
        description: "Your sequences and covers are ready here.",
      })
    } catch (error) {
      toast({
        title: "Could not save Story Studio",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const downloadSequence = async () => {
    if (!selected?.slides.length || isDownloading) return
    setIsDownloading(true)
    let downloaded = 0
    for (const [index, url] of selected.slides.entries()) {
      if (
        await initiateAssetDownload(url, `sselfie-${selected.title || "story"}-${index + 1}.png`)
      ) {
        downloaded += 1
      }
    }
    setIsDownloading(false)
    toast({
      title:
        downloaded === selected.slides.length
          ? "Sequence downloaded"
          : "Some slides could not download",
      description: `${downloaded} of ${selected.slides.length} slides started downloading.`,
    })
  }

  if (!isOpen || !portalTarget) return null

  const previewUrl = selected?.slides[previewIndex] ?? selected?.coverUrl ?? null

  return createPortal(
    <div
      className="fixed inset-0 z-[122] flex items-end justify-center bg-[#0D0E10]/55 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-studio-title"
        className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[24px] border border-[#C5C6C8]/70 bg-[#F8FAFA] shadow-[0_30px_100px_rgba(13,14,16,.24)] sm:max-h-[92dvh] sm:rounded-[24px]"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#C5C6C8]/55 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#818283]">Highlights</p>
            <h2
              id="story-studio-title"
              className="mt-1 font-serif text-[30px] font-light leading-none text-[#0D0E10]"
            >
              Story Studio
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[#4F5052]">
              Build each Highlight as a real Story sequence. Use what you already made, or ask Maya
              for the missing slides.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-11 rounded-full border border-[#C5C6C8] bg-white px-4 text-[10px] uppercase tracking-[0.18em] text-[#4F5052]"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {sequences.length === 0 ? (
            <div className="mx-auto flex min-h-[420px] max-w-md flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#C5C6C8] bg-white font-serif text-[28px] text-[#4F5052]">
                01
              </div>
              <h3 className="mt-5 font-serif text-[28px] font-light text-[#0D0E10]">
                Start with one Highlight.
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
                Add the photos that belong together. You can make as many sequences as you need.
              </p>
              <button
                type="button"
                onClick={addSequence}
                className="mt-6 min-h-11 rounded-[8px] bg-[#0D0E10] px-5 text-[11px] uppercase tracking-[0.17em] text-white"
              >
                Add story sequence
              </button>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)_17rem]">
              <aside className="space-y-2" aria-label="Story sequences">
                {sequences.map((sequence, index) => (
                  <button
                    key={sequence.key}
                    type="button"
                    aria-pressed={sequence.key === selectedKey}
                    onClick={() => {
                      setSelectedKey(sequence.key)
                      setPreviewIndex(0)
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-[10px] border p-2.5 text-left ${sequence.key === selectedKey ? "border-[#0D0E10] bg-white" : "border-[#C5C6C8]/60 bg-[#F8FAFA]"}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEEFF0] text-[11px] text-[#4F5052]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] text-[#0D0E10]">
                        {sequence.title || "Untitled sequence"}
                      </span>
                      <span className="text-[10px] text-[#818283]">
                        {sequence.slides.length} slides
                      </span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addSequence}
                  className="min-h-11 w-full rounded-[8px] border border-dashed border-[#818283] text-[11px] text-[#4F5052]"
                >
                  Add another sequence
                </button>
              </aside>

              {selected ? (
                <section className="min-w-0 space-y-5">
                  <label className="block text-[11px] text-[#4F5052]">
                    Sequence title
                    <input
                      aria-label="Sequence title"
                      value={selected.title}
                      onChange={event => updateSelected({ title: event.target.value })}
                      placeholder="About, Work, Start here…"
                      className="mt-1.5 min-h-11 w-full rounded-[8px] border border-[#C5C6C8] bg-white px-3 text-[14px] text-[#0D0E10] outline-none focus:border-[#0D0E10]"
                    />
                  </label>

                  <div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                          Your Gallery
                        </p>
                        <p className="mt-1 text-[13px] text-[#4F5052]">
                          Tap photos in the order you want them to play.
                        </p>
                      </div>
                      {onCreateWithMaya ? (
                        <button
                          type="button"
                          onClick={() => onCreateWithMaya(selected.title || "my Highlight")}
                          className="min-h-11 text-[11px] text-[#0D0E10] underline underline-offset-4"
                        >
                          Create missing slides with Maya
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {gallery.slice(0, 40).map(asset => {
                        const chosen = selected.slides.includes(asset.url)
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            aria-label={`${chosen ? "Remove from" : "Use in"} sequence: ${asset.id}`}
                            aria-pressed={chosen}
                            onClick={() => addSlide(asset.url)}
                            className={`relative aspect-[9/16] overflow-hidden rounded-[7px] border ${chosen ? "border-[#0D0E10] ring-2 ring-[#0D0E10] ring-offset-1" : "border-[#C5C6C8]/60"}`}
                          >
                            <Image
                              src={asset.thumbnailUrl || asset.url}
                              alt=""
                              fill
                              className="object-cover object-[center_20%]"
                              sizes="120px"
                            />
                            {chosen ? (
                              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0D0E10] text-[9px] text-white">
                                {selected.slides.indexOf(asset.url) + 1}
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                    {gallery.length === 0 ? (
                      <p className="mt-3 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 text-[13px] text-[#4F5052]">
                        Your generated photos will appear here. You can ask Maya to create this
                        sequence now.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                        Highlight cover
                      </p>
                      {onCreateWithMaya ? (
                        <button
                          type="button"
                          onClick={() => onCreateWithMaya(selected.title || "my Highlight", true)}
                          className="min-h-11 text-[11px] text-[#0D0E10] underline underline-offset-4"
                        >
                          Create a cover with Maya
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(
                        [
                          ["photo", "Photo"],
                          ["type", "Simple type"],
                          ["detail", "Detail crop"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={selected.coverStyle === value}
                          onClick={() => updateSelected({ coverStyle: value })}
                          className={`min-h-11 rounded-[8px] border px-2 text-[11px] ${selected.coverStyle === value ? "border-[#0D0E10] bg-white text-[#0D0E10]" : "border-[#C5C6C8] text-[#4F5052]"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block text-[11px] text-[#4F5052]">
                    Maya’s note
                    <textarea
                      aria-label="Maya freshness note"
                      value={selected.freshnessNote}
                      onChange={event => updateSelected({ freshnessNote: event.target.value })}
                      rows={3}
                      className="mt-1.5 w-full rounded-[8px] border border-[#C5C6C8] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#0D0E10]"
                    />
                  </label>
                </section>
              ) : null}

              <aside className="mx-auto w-full max-w-[17rem]">
                <p className="mb-2 text-center text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                  Story preview
                </p>
                <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border-[5px] border-[#0D0E10] bg-[#EEEFF0] shadow-lg">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Story preview"
                      fill
                      className="object-cover object-[center_20%]"
                      sizes="272px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-[12px] leading-relaxed text-[#818283]">
                      Choose photos from your Gallery to preview the sequence.
                    </div>
                  )}
                  {selected?.coverStyle === "type" && previewIndex === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#F8FAFA]/90 px-6 text-center font-serif text-[28px] font-light text-[#0D0E10]">
                      {selected.title || "Your story"}
                    </div>
                  ) : null}
                  {selected?.slides.length ? (
                    <div className="absolute inset-x-2 top-2 flex gap-1">
                      {selected.slides.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          aria-label={`Preview story slide ${index + 1}`}
                          onClick={() => setPreviewIndex(index)}
                          className={`h-0.5 flex-1 rounded-full ${index === previewIndex ? "bg-white" : "bg-white/45"}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                {selected?.slides.length ? (
                  <button
                    type="button"
                    onClick={() => void downloadSequence()}
                    disabled={isDownloading}
                    className="mt-3 min-h-11 w-full rounded-[8px] border border-[#0D0E10] bg-white text-[11px] uppercase tracking-[0.15em] text-[#0D0E10] disabled:opacity-50"
                  >
                    {isDownloading ? "Downloading…" : "Download sequence"}
                  </button>
                ) : null}
                {selected ? (
                  <p className="mt-3 rounded-[8px] bg-white p-3 text-[11px] leading-relaxed text-[#4F5052]">
                    {selected.freshnessNote}
                  </p>
                ) : null}
              </aside>
            </div>
          )}
        </div>

        {sequences.length > 0 ? (
          <footer className="flex items-center justify-between gap-3 border-t border-[#C5C6C8]/55 bg-white px-5 py-3 sm:px-7">
            <button
              type="button"
              onClick={() => {
                if (!selectedKey) return
                setSequences(current => current.filter(item => item.key !== selectedKey))
                setSelectedKey(sequences.find(item => item.key !== selectedKey)?.key ?? null)
              }}
              className="min-h-11 px-2 text-[11px] text-[#4F5052] underline underline-offset-4"
            >
              Remove sequence
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={isSaving}
              className="min-h-11 rounded-[8px] bg-[#0D0E10] px-5 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save Story Studio"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    portalTarget
  )
}
