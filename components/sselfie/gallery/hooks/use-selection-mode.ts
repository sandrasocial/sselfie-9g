"use client"

import { useState, useRef, useCallback } from "react"
import { triggerHaptic } from "@/lib/utils/haptics"

interface UseSelectionModeReturn {
  selectionMode: boolean
  setSelectionMode: (mode: boolean) => void
  selectedImages: Set<string>
  setSelectedImages: React.Dispatch<React.SetStateAction<Set<string>>>
  toggleImageSelection: (imageId: string) => void
  selectAll: (imageIds: string[]) => void
  deselectAll: () => void
  clearSelection: () => void
  wasLongPress: React.MutableRefObject<boolean>
  longPressTimer: React.MutableRefObject<NodeJS.Timeout | null>
  longPressImageId: React.MutableRefObject<string | null>
}

export function useSelectionMode(): UseSelectionModeReturn {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressImageId = useRef<string | null>(null)
  const wasLongPress = useRef(false)

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId)
      } else {
        newSelected.add(imageId)
      }
      return newSelected
    })
    triggerHaptic("light")
  }, [])

  const selectAll = useCallback((imageIds: string[]) => {
    setSelectedImages(new Set(imageIds))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedImages(new Set())
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedImages(new Set())
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    wasLongPress.current = false
  }, [])

  return {
    selectionMode,
    setSelectionMode,
    selectedImages,
    setSelectedImages,
    toggleImageSelection,
    selectAll,
    deselectAll,
    clearSelection,
    wasLongPress,
    longPressTimer,
    longPressImageId,
  }
}

