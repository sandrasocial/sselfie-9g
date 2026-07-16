"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

/** Shared focus, Escape, scroll-lock, and focus-restoration contract for App v3 overlays. */
export function useAccessibleModal(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const initialFocusRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const frame = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus()
      if (!initialFocusRef.current) {
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
      }
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab") return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter(element => element.offsetParent !== null)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
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

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  return { dialogRef, initialFocusRef }
}
