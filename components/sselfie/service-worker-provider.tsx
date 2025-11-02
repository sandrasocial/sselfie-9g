"use client"

import { useEffect } from "react"

export function ServiceWorkerProvider() {
  useEffect(() => {
    const isPreview = typeof window !== "undefined" && window.location.hostname.includes("vusercontent.net")
    const isSecure =
      typeof window !== "undefined" &&
      (window.location.protocol === "https:" || window.location.hostname === "localhost")

    if (!isSecure) {
      console.log("[v0] Skipping service worker registration - not on secure connection")
      return
    }

    if (isPreview) {
      console.log("[v0] Preview environment detected - service worker may not register correctly")
      console.log("[v0] PWA installation will work properly in production (sselfie.ai)")
    }

    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      const registerServiceWorker = async () => {
        try {
          console.log("[v0] Registering service worker...")

          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          })

          console.log("[v0] Service worker registered successfully:", registration.scope)
          console.log("[v0] Service worker registration details:", {
            active: registration.active?.state,
            installing: registration.installing?.state,
            waiting: registration.waiting?.state,
          })

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
        } catch (error) {
          console.error("[v0] Service worker registration failed:", error)
          if (error instanceof Error) {
            console.error("[v0] Error details:", {
              message: error.message,
              name: error.name,
              stack: error.stack,
            })
          }
        }
      }

      registerServiceWorker()
    } else {
      console.log("[v0] Service workers not supported")
    }
  }, [])

  return null
}
