/**
 * useMayaSettings Hook
 * 
 * Manages Maya generation settings with localStorage persistence:
 * - styleStrength: 0.9-1.2 (default: 1.0)
 * - promptAccuracy: 2.5-5.0 (default: 3.5) - Guidance scale
 * - aspectRatio: "1:1" | "4:5" | "16:9" (default: "4:5")
 * - realismStrength: 0.0-0.8 (default: 0.2) - Extra LoRA scale
 * - enhancedAuthenticity: boolean (default: false) - Classic mode only
 * 
 * Settings are automatically saved to localStorage with debouncing (500ms delay).
 * Settings are loaded from localStorage on mount.
 */

import { useState, useEffect, useRef } from "react"

export interface MayaSettings {
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  enhancedAuthenticity: boolean
}

const DEFAULT_SETTINGS: MayaSettings = {
  styleStrength: 1.0,
  promptAccuracy: 3.5,
  aspectRatio: "4:5",
  realismStrength: 0.2,
  enhancedAuthenticity: false,
}

const STORAGE_KEY = "mayaGenerationSettings"
const ENHANCED_AUTHENTICITY_KEY = "mayaEnhancedAuthenticity"
const SAVE_DEBOUNCE_MS = 500

/**
 * Load settings from localStorage, applying migrations for old defaults
 */
function loadSettingsFromStorage(): Partial<MayaSettings> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const settingsStr = localStorage.getItem(STORAGE_KEY)
    if (!settingsStr) {
      return {}
    }

    const settings = JSON.parse(settingsStr)
    
    // Migrate old defaults:
    // - 1.1 -> 1.0 (old default migration)
    // - 0.4 -> 0.2 (old realismStrength default)
    const loadedStyleStrength = settings.styleStrength ?? DEFAULT_SETTINGS.styleStrength
    const migratedStyleStrength = loadedStyleStrength === 1.1 ? 1.0 : loadedStyleStrength
    
    const loadedRealismStrength = settings.realismStrength ?? DEFAULT_SETTINGS.realismStrength
    const migratedRealismStrength = loadedRealismStrength === 0.4 ? 0.2 : loadedRealismStrength

    return {
      styleStrength: migratedStyleStrength,
      promptAccuracy: settings.promptAccuracy ?? DEFAULT_SETTINGS.promptAccuracy,
      aspectRatio: settings.aspectRatio ?? DEFAULT_SETTINGS.aspectRatio,
      realismStrength: migratedRealismStrength,
    }
  } catch (error) {
    console.error("[useMayaSettings] ❌ Error loading settings from localStorage:", error)
    return {}
  }
}

/**
 * Load enhancedAuthenticity from localStorage
 */
function loadEnhancedAuthenticity(): boolean {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS.enhancedAuthenticity
  }

  const saved = localStorage.getItem(ENHANCED_AUTHENTICITY_KEY)
  return saved === "true"
}

/**
 * Save settings to localStorage (debounced)
 */
function saveSettingsToStorage(settings: Omit<MayaSettings, "enhancedAuthenticity">) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    console.log("[useMayaSettings] 💾 Saved settings to localStorage:", settings)
  } catch (error) {
    console.error("[useMayaSettings] ❌ Error saving settings to localStorage:", error)
  }
}

/**
 * Save enhancedAuthenticity to localStorage
 */
function saveEnhancedAuthenticity(value: boolean) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(ENHANCED_AUTHENTICITY_KEY, value.toString())
    console.log("[useMayaSettings] 💾 Saved enhanced authenticity setting:", value)
  } catch (error) {
    console.error("[useMayaSettings] ❌ Error saving enhanced authenticity:", error)
  }
}

export interface UseMayaSettingsReturn {
  // Settings values
  settings: MayaSettings
  
  // Individual setters
  setStyleStrength: (value: number) => void
  setPromptAccuracy: (value: number) => void
  setAspectRatio: (value: string) => void
  setRealismStrength: (value: number) => void
  setEnhancedAuthenticity: (value: boolean) => void
  
  // Batch setter (useful for loading from API or resetting)
  setSettings: (settings: Partial<MayaSettings>) => void
  
  // Reset to defaults
  resetSettings: () => void
}

export function useMayaSettings(): UseMayaSettingsReturn {
  // Initialize state with defaults, then load from localStorage
  const [styleStrength, setStyleStrength] = useState<number>(DEFAULT_SETTINGS.styleStrength)
  const [promptAccuracy, setPromptAccuracy] = useState<number>(DEFAULT_SETTINGS.promptAccuracy)
  const [aspectRatio, setAspectRatio] = useState<string>(DEFAULT_SETTINGS.aspectRatio)
  const [realismStrength, setRealismStrength] = useState<number>(DEFAULT_SETTINGS.realismStrength)
  const [enhancedAuthenticity, setEnhancedAuthenticity] = useState<boolean>(
    DEFAULT_SETTINGS.enhancedAuthenticity
  )

  // Refs for debounced saving
  const settingsSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedFromStorageRef = useRef(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (hasLoadedFromStorageRef.current) {
      return
    }

    const loadedSettings = loadSettingsFromStorage()
    const loadedEnhancedAuthenticity = loadEnhancedAuthenticity()

    if (Object.keys(loadedSettings).length > 0) {
      console.log("[useMayaSettings] 📊 Loaded saved settings from localStorage:", loadedSettings)
      if (loadedSettings.styleStrength !== undefined) {
        setStyleStrength(loadedSettings.styleStrength)
      }
      if (loadedSettings.promptAccuracy !== undefined) {
        setPromptAccuracy(loadedSettings.promptAccuracy)
      }
      if (loadedSettings.aspectRatio !== undefined) {
        setAspectRatio(loadedSettings.aspectRatio)
      }
      if (loadedSettings.realismStrength !== undefined) {
        setRealismStrength(loadedSettings.realismStrength)
      }
    } else {
      console.log("[useMayaSettings] 📊 No saved settings found, using defaults")
    }

    setEnhancedAuthenticity(loadedEnhancedAuthenticity)
    hasLoadedFromStorageRef.current = true
  }, [])

  // Debounced save for main settings (styleStrength, promptAccuracy, aspectRatio, realismStrength)
  useEffect(() => {
    // Skip save on initial load
    if (!hasLoadedFromStorageRef.current) {
      return
    }

    // Clear any existing timer
    if (settingsSaveTimerRef.current) {
      clearTimeout(settingsSaveTimerRef.current)
    }

    // Set new timer to save after debounce delay
    settingsSaveTimerRef.current = setTimeout(() => {
      saveSettingsToStorage({
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength,
      })
    }, SAVE_DEBOUNCE_MS)

    // Cleanup timer on unmount or dependency change
    return () => {
      if (settingsSaveTimerRef.current) {
        clearTimeout(settingsSaveTimerRef.current)
      }
    }
  }, [styleStrength, promptAccuracy, aspectRatio, realismStrength])

  // Save enhancedAuthenticity immediately (no debounce needed)
  useEffect(() => {
    // Skip save on initial load
    if (!hasLoadedFromStorageRef.current) {
      return
    }

    saveEnhancedAuthenticity(enhancedAuthenticity)
  }, [enhancedAuthenticity])

  // Batch setter for convenience
  const setSettings = (newSettings: Partial<MayaSettings>) => {
    if (newSettings.styleStrength !== undefined) {
      setStyleStrength(newSettings.styleStrength)
    }
    if (newSettings.promptAccuracy !== undefined) {
      setPromptAccuracy(newSettings.promptAccuracy)
    }
    if (newSettings.aspectRatio !== undefined) {
      setAspectRatio(newSettings.aspectRatio)
    }
    if (newSettings.realismStrength !== undefined) {
      setRealismStrength(newSettings.realismStrength)
    }
    if (newSettings.enhancedAuthenticity !== undefined) {
      setEnhancedAuthenticity(newSettings.enhancedAuthenticity)
    }
  }

  // Reset to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  return {
    settings: {
      styleStrength,
      promptAccuracy,
      aspectRatio,
      realismStrength,
      enhancedAuthenticity,
    },
    setStyleStrength,
    setPromptAccuracy,
    setAspectRatio,
    setRealismStrength,
    setEnhancedAuthenticity,
    setSettings,
    resetSettings,
  }
}
