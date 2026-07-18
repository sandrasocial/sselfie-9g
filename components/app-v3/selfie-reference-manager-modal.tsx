"use client"

import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import Image from "next/image"
import { announceIdentityUpdated } from "./use-identity-references"

type ReferenceSlot = "face" | "angle" | "side" | "body" | "inspiration"

type ReferenceLibraryResponse = {
  images?: string[]
  extras?: {
    threeQuarter?: string | null
    sideProfile?: string | null
    fullBody?: string | null
    inspiration?: string | null
  }
}

type ManagedSlot = {
  slot: Exclude<ReferenceSlot, "face">
  label: string
  help: string
  value: string | null
  inputRef: RefObject<HTMLInputElement | null>
}

const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp"

export function SelfieReferenceManagerModal({
  open,
  initialFaceUrl,
  onClose,
  onFaceReady,
  onExtraReady,
  onContinue,
  hideOptionalReferences = false,
  initialFocus = "face",
}: {
  open: boolean
  initialFaceUrl?: string | null
  onClose: () => void
  onFaceReady?: (url: string, source: "upload" | "saved") => void
  onExtraReady?: (slot: Exclude<ReferenceSlot, "face">, url: string | null) => void
  onContinue: (url: string) => void
  hideOptionalReferences?: boolean
  initialFocus?: "face" | "inspiration"
}) {
  const faceInputRef = useRef<HTMLInputElement>(null)
  const angleInputRef = useRef<HTMLInputElement>(null)
  const sideInputRef = useRef<HTMLInputElement>(null)
  const bodyInputRef = useRef<HTMLInputElement>(null)
  const inspirationInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const [faceUrl, setFaceUrl] = useState<string | null>(initialFaceUrl ?? null)
  const [pastSelfies, setPastSelfies] = useState<string[] | null>(null)
  const [threeQuarterUrl, setThreeQuarterUrl] = useState<string | null>(null)
  const [sideProfileUrl, setSideProfileUrl] = useState<string | null>(null)
  const [fullBodyUrl, setFullBodyUrl] = useState<string | null>(null)
  const [inspirationUrl, setInspirationUrl] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<ReferenceSlot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    setError(null)
    setPastSelfies(null)
    setFaceUrl(initialFaceUrl ?? null)
    fetch("/api/app-v3/reference-library")
      .then(response => {
        if (!response.ok) throw new Error(`Selfies returned ${response.status}`)
        return response.json()
      })
      .then((data: ReferenceLibraryResponse | null) => {
        if (!alive) return
        const images = Array.isArray(data?.images) ? data.images : []
        setPastSelfies(images)
        setFaceUrl(current => current ?? images[0] ?? null)
        setThreeQuarterUrl(data?.extras?.threeQuarter ?? null)
        setSideProfileUrl(data?.extras?.sideProfile ?? null)
        setFullBodyUrl(data?.extras?.fullBody ?? null)
        setInspirationUrl(data?.extras?.inspiration ?? null)
      })
      .catch(() => {
        if (!alive) return
        setPastSelfies([])
        setError("I could not load your saved selfies. You can still upload one here.")
      })
    return () => {
      alive = false
    }
  }, [initialFaceUrl, open])

  useEffect(() => {
    if (!open) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab") return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), summary, a[href], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter(element => element.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", onKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  async function handleUpload(slot: ReferenceSlot, file: File) {
    setError(null)
    setUploadingSlot(slot)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("slot", slot)
      const response = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await response.json().catch(() => null)) as {
        url?: string
        error?: string
      } | null
      if (!response.ok || !data?.url) throw new Error(data?.error || "Upload failed")
      // capture the narrowed string: property narrowing does not survive into the setState closure
      const uploadedUrl = data.url

      if (slot === "face") {
        setFaceUrl(uploadedUrl)
        setPastSelfies(current => [
          uploadedUrl,
          ...(current ?? []).filter(url => url !== uploadedUrl),
        ])
        onFaceReady?.(uploadedUrl, "upload")
      } else if (slot === "angle") {
        setThreeQuarterUrl(data.url)
        onExtraReady?.("angle", data.url)
      } else if (slot === "side") {
        setSideProfileUrl(data.url)
        onExtraReady?.("side", data.url)
      } else if (slot === "body") {
        setFullBodyUrl(data.url)
        onExtraReady?.("body", data.url)
      } else {
        setInspirationUrl(data.url)
        onExtraReady?.("inspiration", data.url)
      }
      announceIdentityUpdated()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
    } finally {
      setUploadingSlot(null)
    }
  }

  async function clearSlot(slot: Exclude<ReferenceSlot, "face">) {
    setError(null)
    try {
      const response = await fetch(`/api/app-v3/upload-selfie?slot=${slot}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Couldn't remove that photo. Please try again.")
      if (slot === "angle") setThreeQuarterUrl(null)
      else if (slot === "side") setSideProfileUrl(null)
      else if (slot === "body") setFullBodyUrl(null)
      else setInspirationUrl(null)
      onExtraReady?.(slot, null)
      announceIdentityUpdated()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Couldn't remove that photo.")
    }
  }

  const optionalSlots: ManagedSlot[] = [
    {
      slot: "angle",
      label: "Three-quarter face",
      help: "Good for likeness when your main selfie is very straight-on.",
      value: threeQuarterUrl,
      inputRef: angleInputRef,
    },
    {
      slot: "side",
      label: "Side profile",
      help: "Optional. Helps Maya understand your face shape.",
      value: sideProfileUrl,
      inputRef: sideInputRef,
    },
    {
      slot: "body",
      label: "Full body",
      help: "Optional. Helps with outfits, posture, and proportions.",
      value: fullBodyUrl,
      inputRef: bodyInputRef,
    },
    {
      slot: "inspiration",
      label: "Inspiration",
      help: "For pose, light, or vibe only. Maya will not use this as your face.",
      value: inspirationUrl,
      inputRef: inspirationInputRef,
    },
  ]

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="selfie-manager-title"
      className="fixed inset-0 z-[85] bg-[color:var(--ss-night)]/55 px-3 py-4 backdrop-blur-sm sm:px-6 sm:py-8"
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[10px] bg-[color:var(--ss-seasalt)] shadow-[0_30px_90px_rgba(13,14,16,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--ss-silver)]/55 px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ss-gray)]">
              {initialFocus === "inspiration" ? "Your inspiration" : "Your face"}
            </p>
            <h2
              id="selfie-manager-title"
              className="mt-2 font-serif text-[30px] font-light leading-[1.05] text-[color:var(--ss-night)] sm:text-[40px]"
            >
              {initialFocus === "inspiration"
                ? "Add visual inspiration."
                : "Start with one clear selfie."}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[color:var(--ss-davy)]">
              {initialFocus === "inspiration"
                ? "Add a photo for pose, light, or mood. Maya keeps your saved selfie as your identity."
                : hideOptionalReferences
                  ? "Choose one selfie. Maya will keep your real face and create one brand photo you can use today."
                  : "Choose the selfie Maya should protect. Add extra angles only if you have them. Inspiration stays separate, so it never becomes your face."}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-[4px] border border-[color:var(--ss-silver)] px-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-night)] transition-colors hover:border-[color:var(--ss-night)]"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[8px] border border-[color:var(--ss-silver)]/60 bg-[color:var(--ss-white)] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
                Selected selfie
              </p>
              <div className="mx-auto mt-3 w-full max-w-[220px] overflow-hidden rounded-[7px] border border-[color:var(--ss-silver)] bg-[color:var(--ss-seasalt)] lg:max-w-none">
                <div className="relative aspect-[4/5] w-full">
                  {faceUrl ? (
                    <Image
                      src={faceUrl}
                      alt="Selected main selfie"
                      fill
                      className="object-cover"
                      sizes="420px"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => faceInputRef.current?.click()}
                      disabled={uploadingSlot === "face"}
                      className="flex h-full w-full flex-col items-center justify-center px-6 text-center transition-colors hover:bg-[color:var(--ss-white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--ss-night)] disabled:opacity-60"
                    >
                      <span className="font-serif text-[23px] font-light text-[color:var(--ss-night)]">
                        {uploadingSlot === "face" ? "Uploading your selfie…" : "Upload your selfie"}
                      </span>
                      <span className="mt-2 text-[12px] leading-relaxed text-[color:var(--ss-davy)]">
                        Choose a clear photo from your phone
                      </span>
                    </button>
                  )}
                </div>
              </div>
              {faceUrl && (
                <button
                  type="button"
                  onClick={() => faceInputRef.current?.click()}
                  disabled={uploadingSlot === "face"}
                  className="mt-3 min-h-11 rounded-[4px] bg-[color:var(--ss-night)] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-60"
                >
                  {uploadingSlot === "face" ? "Uploading..." : "Change selfie"}
                </button>
              )}
              <input
                ref={faceInputRef}
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) void handleUpload("face", file)
                  if (faceInputRef.current) faceInputRef.current.value = ""
                }}
              />
              <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--ss-davy)]">
                Use a clear photo where your face is visible. It does not need to be perfect.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-[8px] border border-[color:var(--ss-silver)]/60 bg-[color:var(--ss-white)] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
                  Saved selfies
                </p>
                {pastSelfies === null && (
                  <p className="mt-3 text-[13px] text-[color:var(--ss-gray)]">
                    Loading your saved selfies…
                  </p>
                )}
                {pastSelfies && pastSelfies.length === 0 && (
                  <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--ss-gray)]">
                    No saved selfies yet. Once you upload one, it will show here.
                  </p>
                )}
                {pastSelfies && pastSelfies.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {pastSelfies.slice(0, 8).map(url => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => {
                          setFaceUrl(url)
                          onFaceReady?.(url, "saved")
                          announceIdentityUpdated()
                        }}
                        className={`relative aspect-square overflow-hidden rounded-[5px] border transition-colors ${
                          faceUrl === url
                            ? "border-[color:var(--ss-night)] ring-2 ring-[color:var(--ss-night)]/10"
                            : "border-[color:var(--ss-silver)]/60 hover:border-[color:var(--ss-night)]/60"
                        }`}
                        aria-label={`Use saved selfie ${pastSelfies.indexOf(url) + 1}`}
                        aria-pressed={faceUrl === url}
                      >
                        <Image
                          src={url}
                          alt="Saved selfie"
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!hideOptionalReferences && (
                <details
                  open={initialFocus === "inspiration"}
                  className="group rounded-[8px] border border-[color:var(--ss-silver)]/60 bg-[color:var(--ss-white)]"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-[11px] uppercase tracking-[0.16em] text-[color:var(--ss-davy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--ss-night)] [&::-webkit-details-marker]:hidden">
                    Improve likeness with extra angles
                    <span aria-hidden className="text-[18px] font-light group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-t border-[color:var(--ss-silver)]/50 p-4">
                    <p className="text-[13px] leading-relaxed text-[color:var(--ss-davy)]">
                      One selfie is enough. These are optional if you want to add more context
                      later.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {optionalSlots.map(item => (
                        <div
                          key={item.slot}
                          className="rounded-[6px] border border-[color:var(--ss-silver)] bg-[color:var(--ss-seasalt)] p-3"
                        >
                          <div className="flex gap-3">
                            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[4px] bg-[color:var(--ss-white)]">
                              {item.value ? (
                                <Image
                                  src={item.value}
                                  alt={item.label}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[18px] text-[color:var(--ss-gray)]">
                                  +
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-[color:var(--ss-night)]">
                                {item.label}
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--ss-davy)]">
                                {item.help}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => item.inputRef.current?.click()}
                                  disabled={uploadingSlot === item.slot}
                                  className="min-h-11 rounded-[4px] border border-[color:var(--ss-silver)]/60 bg-[color:var(--ss-white)] px-3 text-[10px] uppercase tracking-[0.14em] text-[color:var(--ss-davy)] hover:border-[color:var(--ss-night)]/40 disabled:opacity-60"
                                >
                                  {uploadingSlot === item.slot
                                    ? "Uploading..."
                                    : item.value
                                      ? "Change"
                                      : "Add"}
                                </button>
                                {item.value && (
                                  <button
                                    type="button"
                                    onClick={() => void clearSlot(item.slot)}
                                    className="min-h-11 rounded-[4px] border border-[color:var(--ss-silver)]/60 bg-[color:var(--ss-white)] px-3 text-[10px] uppercase tracking-[0.14em] text-[color:var(--ss-gray)] hover:border-[color:var(--ss-night)]/40 hover:text-[color:var(--ss-night)]"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <input
                                ref={item.inputRef}
                                type="file"
                                accept={IMAGE_UPLOAD_ACCEPT}
                                className="hidden"
                                onChange={event => {
                                  const file = event.target.files?.[0]
                                  if (file) void handleUpload(item.slot, file)
                                  if (item.inputRef.current) item.inputRef.current.value = ""
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              {error && (
                <p
                  role="alert"
                  className="text-[13px] leading-relaxed text-[color:var(--ss-raisin)]"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[color:var(--ss-silver)]/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-[12px] leading-relaxed text-[color:var(--ss-davy)]">
            You can come back and change this anytime.
          </p>
          {/* ONE way forward. "Done" + "Close" + "Continue" was three exits at the app's most
              fragile moment (she just uploaded her face) - the top Close already covers leaving. */}
          <button
            type="button"
            disabled={!faceUrl}
            onClick={() => {
              if (!faceUrl) return
              onContinue(faceUrl)
            }}
            className="min-h-11 rounded-[4px] bg-[color:var(--ss-night)] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {faceUrl ? "Continue with Maya" : "Upload a selfie to continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
