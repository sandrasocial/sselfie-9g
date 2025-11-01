"use client"

import { useEffect } from "react"

export function ServiceWorkerProvider() {
  useEffect(() => {
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      console.log("[v0] Registering service worker...")

      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[v0] Service worker registered successfully:", registration.scope)

          // Check for updates periodically
          registration.update()

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            console.log("[v0] Service worker update found")
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[v0] New service worker installed, refresh to activate")
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("[v0] Service worker registration failed:", error)
        })
    } else {
      console.log("[v0] Service workers not supported")
    }
  }, [])

  return null
}
