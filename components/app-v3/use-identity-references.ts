"use client"

import { useCallback, useEffect, useState } from "react"

export const IDENTITY_UPDATED_EVENT = "sselfie:identity-updated"

export type IdentityReferences = {
  images: string[]
  extras: {
    threeQuarter: string | null
    sideProfile: string | null
    fullBody: string | null
    inspiration: string | null
  }
}

const EMPTY_IDENTITY: IdentityReferences = {
  images: [],
  extras: {
    threeQuarter: null,
    sideProfile: null,
    fullBody: null,
    inspiration: null,
  },
}

function cleanUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("http") ? value : null
}

export function announceIdentityUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(IDENTITY_UPDATED_EVENT))
}

export function useIdentityReferences(
  initialHasSelfie = false,
  initialPrimarySelfieUrl: string | null = null
) {
  const serverPrimarySelfieUrl = cleanUrl(initialPrimarySelfieUrl)
  const [identity, setIdentity] = useState<IdentityReferences>(() => ({
    ...EMPTY_IDENTITY,
    images: serverPrimarySelfieUrl ? [serverPrimarySelfieUrl] : [],
  }))
  const [hasSelfie, setHasSelfie] = useState(initialHasSelfie || Boolean(serverPrimarySelfieUrl))
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/app-v3/reference-library", { cache: "no-store" })
      if (!response.ok) throw new Error(`Identity returned ${response.status}`)
      const data = (await response.json().catch(() => null)) as {
        images?: unknown
        extras?: {
          threeQuarter?: unknown
          sideProfile?: unknown
          fullBody?: unknown
          inspiration?: unknown
        }
      } | null
      const hydratedImages = Array.isArray(data?.images)
        ? data.images.map(cleanUrl).filter((url): url is string => Boolean(url))
        : []
      setIdentity(current => {
        const images = hydratedImages.length > 0 ? hydratedImages : current.images
        return {
          images,
          extras: {
            threeQuarter: cleanUrl(data?.extras?.threeQuarter),
            sideProfile: cleanUrl(data?.extras?.sideProfile),
            fullBody: cleanUrl(data?.extras?.fullBody),
            inspiration: cleanUrl(data?.extras?.inspiration),
          },
        }
      })
      setHasSelfie(current => current || hydratedImages.length > 0)
    } catch {
      // The server-rendered truth remains the fallback if the live library is unavailable.
      setHasSelfie(current => current || initialHasSelfie)
    } finally {
      setLoading(false)
    }
  }, [initialHasSelfie])

  useEffect(() => {
    void refresh()
    const onIdentityUpdated = () => void refresh()
    window.addEventListener(IDENTITY_UPDATED_EVENT, onIdentityUpdated)
    return () => window.removeEventListener(IDENTITY_UPDATED_EVENT, onIdentityUpdated)
  }, [refresh])

  return {
    identity,
    hasSelfie,
    loading,
    primarySelfieUrl: identity.images[0] ?? null,
    referenceCount:
      identity.images.length +
      [identity.extras.threeQuarter, identity.extras.sideProfile, identity.extras.fullBody].filter(
        Boolean
      ).length,
    refresh,
  }
}
