"use client"

import { useEffect } from "react"
import { toast } from "sonner"

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
      console.log("[v0] Preview environment detected - skipping service worker registration")
      console.log("[v0] PWA installation will work properly in production (sselfie.ai)")
      return // Exit early in preview environments
    }

    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      const registerServiceWorker = async () => {
        try {
          console.log("[v0] Registering service worker...")

          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          })

          console.log("[v0] Service worker registered successfully:", registration.scope)

          setInterval(
            () => {
              registration.update()
            },
            60 * 60 * 1000,
          )

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            console.log("[v0] Service worker update found")
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[v0] New service worker installed, refresh to activate")
                  toast("Update Available", {
                    description: "A new version of SSELFIE is available. Refresh to update.",
                    action: {
                      label: "Refresh",
                      onClick: () => {
                        newWorker.postMessage({ type: "SKIP_WAITING" })
                        window.location.reload()
                      },
                    },
                    duration: 10000,
                  })
                }
              })
            }
          })

          navigator.serviceWorker.addEventListener("controllerchange", () => {
            console.log("[v0] Service worker controller changed, reloading...")
            window.location.reload()
          })

          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data && event.data.type === "SW_UPDATED") {
              console.log("[v0] Service worker updated to version:", event.data.version)
            }
          })
        } catch (error) {
          console.error("[v0] Service worker registration failed:", error)
        }
      }

      registerServiceWorker()
    } else {
      console.log("[v0] Service workers not supported")
    }
  }, [])

  return null
}
