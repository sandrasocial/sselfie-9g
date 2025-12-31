/**
 * useMayaMode Hook
 * 
 * Manages Maya Studio Pro Mode state with localStorage persistence:
 * - studioProMode: boolean (default: false)
 * - Mode persistence to localStorage
 * - Support for forced mode (admin mode)
 * 
 * The mode affects:
 * - UI components (Classic vs Pro interface)
 * - API endpoints (different chat types)
 * - Feature availability
 */

import { useState, useEffect, useRef } from "react"

const STORAGE_KEY = "mayaStudioProMode"

/**
 * Load mode from localStorage
 */
function loadModeFromStorage(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === "true"
}

/**
 * Save mode to localStorage
 */
function saveModeToStorage(mode: boolean) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, mode.toString())
    console.log("[useMayaMode] 💾 Saved mode to localStorage:", mode ? "Studio Pro" : "Classic")
  } catch (error) {
    console.error("[useMayaMode] ❌ Error saving mode to localStorage:", error)
  }
}

export interface UseMayaModeReturn {
  // Mode state
  studioProMode: boolean
  
  // Setter
  setStudioProMode: (mode: boolean) => void
  
  // Get current mode as string ('pro' | 'maya')
  getModeString: () => "pro" | "maya"
  
  // Check if mode changed (useful for tracking changes)
  hasModeChanged: (previousMode: string | null) => boolean
}

/**
 * Hook to manage Maya Studio Pro Mode
 * 
 * @param forcedMode - Optional forced mode (from admin/props). If provided, this takes precedence over localStorage
 * @returns Mode state and utilities
 */
export function useMayaMode(forcedMode?: boolean): UseMayaModeReturn {
  const hasLoadedFromStorageRef = useRef(false)
  
  // Initialize state: forcedMode takes precedence, then localStorage, then default false
  const [studioProMode, setStudioProModeState] = useState<boolean>(() => {
    // If forcedMode is explicitly provided (even if false), use it
    if (forcedMode !== undefined) {
      return forcedMode
    }
    
    // Otherwise, load from localStorage
    return loadModeFromStorage()
  })

  // Update state if forcedMode changes (for admin mode changes)
  useEffect(() => {
    if (forcedMode !== undefined && forcedMode !== studioProMode) {
      console.log("[useMayaMode] Forced mode changed, updating:", forcedMode ? "Studio Pro" : "Classic")
      setStudioProModeState(forcedMode)
    }
  }, [forcedMode])

  // Save mode to localStorage when it changes (but not on initial load)
  useEffect(() => {
    // Skip save on initial mount (to avoid overwriting with default)
    if (!hasLoadedFromStorageRef.current) {
      hasLoadedFromStorageRef.current = true
      return
    }

    // Don't save if we're in forced mode (admin control)
    if (forcedMode !== undefined) {
      return
    }

    saveModeToStorage(studioProMode)
  }, [studioProMode, forcedMode])

  // Setter wrapper that can be called externally
  const setStudioProMode = (mode: boolean) => {
    // Don't allow changes if forced mode is set (admin control)
    if (forcedMode !== undefined) {
      console.log("[useMayaMode] ⚠️ Mode change blocked - forced mode is active:", forcedMode ? "Studio Pro" : "Classic")
      return
    }
    
    console.log("[useMayaMode] ✅ Mode change allowed, setting to:", mode ? "Studio Pro" : "Classic")
    setStudioProModeState(mode)
  }

  // Get current mode as string
  const getModeString = (): "pro" | "maya" => {
    return studioProMode ? "pro" : "maya"
  }

  // Check if mode changed from previous mode string
  const hasModeChanged = (previousMode: string | null): boolean => {
    if (previousMode === null) {
      return false
    }
    const currentMode = getModeString()
    return previousMode !== currentMode
  }

  return {
    studioProMode,
    setStudioProMode,
    getModeString,
    hasModeChanged,
  }
}

