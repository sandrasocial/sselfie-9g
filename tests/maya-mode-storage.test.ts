import { describe, expect, it } from "vitest"

import {
  MAYA_MODE_STORAGE_KEY,
  MAYA_MODE_TOUCHED_STORAGE_KEY,
  readMayaProModePreference,
  writeMayaProModePreference,
} from "@/lib/maya/mode-storage"

function createStorage(initial: Record<string, string | null> = {}) {
  const store = new Map<string, string>()

  Object.entries(initial).forEach(([key, value]) => {
    if (value !== null) {
      store.set(key, value)
    }
  })

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe("maya mode storage", () => {
  it("defaults to selfie mode until the user explicitly chooses a mode", () => {
    const storage = createStorage({
      [MAYA_MODE_STORAGE_KEY]: "false",
    })

    expect(readMayaProModePreference(storage)).toBe(true)
  })

  it("respects an explicit saved classic preference", () => {
    const storage = createStorage({
      [MAYA_MODE_STORAGE_KEY]: "false",
      [MAYA_MODE_TOUCHED_STORAGE_KEY]: "true",
    })

    expect(readMayaProModePreference(storage)).toBe(false)
  })

  it("marks the preference as touched when saving", () => {
    const storage = createStorage()

    writeMayaProModePreference(false, storage)

    expect(storage.getItem(MAYA_MODE_STORAGE_KEY)).toBe("false")
    expect(storage.getItem(MAYA_MODE_TOUCHED_STORAGE_KEY)).toBe("true")
  })
})
