"use client"

import { useEffect, useRef, useState } from "react"
import { Heart } from "lucide-react"

function normalizeAssetId(assetId: string | number | null | undefined): string | null {
  if (typeof assetId === "number" && Number.isFinite(assetId)) return `ai_${assetId}`
  if (typeof assetId !== "string") return null
  if (/^(?:ai|gen)_\d+$/.test(assetId)) return assetId
  if (/^\d+$/.test(assetId)) return `ai_${assetId}`
  return null
}

export const FAVORITE_UPDATED_EVENT = "sselfie:favorite-updated"
export type FavoriteUpdatedDetail = { assetId: string; isFavorite: boolean }
const favoriteState = new Map<string, boolean>()
const mountedFavoriteButtons = new Map<string, number>()

export function FavoriteButton({
  assetId,
  initialFavorite = false,
  dark = false,
}: {
  assetId: string | number | null | undefined
  initialFavorite?: boolean
  dark?: boolean
}) {
  const normalizedAssetId = normalizeAssetId(assetId)
  const [isFavorite, setIsFavorite] = useState(
    normalizedAssetId ? (favoriteState.get(normalizedAssetId) ?? initialFavorite) : initialFavorite
  )
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!normalizedAssetId) return
    if (!favoriteState.has(normalizedAssetId)) favoriteState.set(normalizedAssetId, initialFavorite)
    mountedFavoriteButtons.set(
      normalizedAssetId,
      (mountedFavoriteButtons.get(normalizedAssetId) ?? 0) + 1
    )
    const syncFavorite = (event: Event) => {
      const detail = (event as CustomEvent<FavoriteUpdatedDetail>).detail
      if (detail?.assetId === normalizedAssetId) setIsFavorite(detail.isFavorite)
    }
    window.addEventListener(FAVORITE_UPDATED_EVENT, syncFavorite)
    return () => {
      window.removeEventListener(FAVORITE_UPDATED_EVENT, syncFavorite)
      const nextCount = (mountedFavoriteButtons.get(normalizedAssetId) ?? 1) - 1
      if (nextCount > 0) mountedFavoriteButtons.set(normalizedAssetId, nextCount)
      else {
        mountedFavoriteButtons.delete(normalizedAssetId)
        favoriteState.delete(normalizedAssetId)
      }
    }
  }, [initialFavorite, normalizedAssetId])

  if (!normalizedAssetId) return null
  const persistedAssetId = normalizedAssetId

  async function toggleFavorite() {
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(false)
    const previous = isFavorite
    const next = !previous
    favoriteState.set(persistedAssetId, next)
    window.dispatchEvent(
      new CustomEvent(FAVORITE_UPDATED_EVENT, {
        detail: { assetId: persistedAssetId, isFavorite: next },
      })
    )
    try {
      const response = await fetch("/api/app-v3/gallery/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: persistedAssetId, isFavorite: next }),
      })
      if (!response.ok) throw new Error("Favorite failed")
    } catch {
      favoriteState.set(persistedAssetId, previous)
      window.dispatchEvent(
        new CustomEvent(FAVORITE_UPDATED_EVENT, {
          detail: { assetId: persistedAssetId, isFavorite: previous },
        })
      )
      setError(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void toggleFavorite()}
        disabled={pending}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border px-4 py-3 text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-60 ${
          dark
            ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
            : "border-[color:var(--ss-silver)] bg-white text-[color:var(--ss-raisin)] hover:border-[color:var(--ss-night)]"
        }`}
      >
        <Heart size={15} aria-hidden className={isFavorite ? "fill-red-500 text-red-500" : ""} />
        {isFavorite ? "Saved" : "Favorite"}
      </button>
      {error ? (
        <span
          role="alert"
          className={
            dark ? "text-[11px] text-white/75" : "text-[11px] text-[color:var(--ss-davy)]"
          }
        >
          Couldn&apos;t update favorite. Please try again.
        </span>
      ) : null}
    </div>
  )
}
