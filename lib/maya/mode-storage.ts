export const MAYA_MODE_STORAGE_KEY = "mayaProMode"
export const MAYA_MODE_TOUCHED_STORAGE_KEY = "mayaProModeTouched"

type ReadableStorage = Pick<Storage, "getItem">
type WritableStorage = Pick<Storage, "getItem" | "setItem">

function resolveReadableStorage(storage?: ReadableStorage): ReadableStorage | undefined {
  if (storage) return storage
  if (typeof window === "undefined") return undefined
  return window.localStorage
}

function resolveWritableStorage(storage?: WritableStorage): WritableStorage | undefined {
  if (storage) return storage
  if (typeof window === "undefined") return undefined
  return window.localStorage
}

export function readMayaProModePreference(storage?: ReadableStorage): boolean {
  const resolvedStorage = resolveReadableStorage(storage)
  if (!resolvedStorage) return true

  const hasExplicitPreference = resolvedStorage.getItem(MAYA_MODE_TOUCHED_STORAGE_KEY) === "true"
  if (!hasExplicitPreference) {
    return true
  }

  return resolvedStorage.getItem(MAYA_MODE_STORAGE_KEY) === "true"
}

export function writeMayaProModePreference(mode: boolean, storage?: WritableStorage) {
  const resolvedStorage = resolveWritableStorage(storage)
  if (!resolvedStorage) return

  resolvedStorage.setItem(MAYA_MODE_STORAGE_KEY, mode.toString())
  resolvedStorage.setItem(MAYA_MODE_TOUCHED_STORAGE_KEY, "true")
}
