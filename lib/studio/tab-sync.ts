export function scheduleStudioTabUpdate(callback: () => void): () => void {
  let cancelled = false
  const run = () => {
    if (!cancelled) {
      callback()
    }
  }

  if (typeof queueMicrotask === "function") {
    queueMicrotask(run)
    return () => {
      cancelled = true
    }
  }

  const timeoutId = setTimeout(run, 0)
  return () => {
    cancelled = true
    clearTimeout(timeoutId)
  }
}
