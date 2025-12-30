"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, Share } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [isWaitingForPrompt, setIsWaitingForPrompt] = useState(true)

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    console.log("[v0] Install prompt - Is standalone:", isStandalone)

    if (isStandalone) {
      setIsInstalled(true)
      setIsWaitingForPrompt(false)
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const iOS = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iOS)

    const dismissed = localStorage.getItem("installPromptDismissed")
    if (dismissed) {
      const dismissedTime = Number.parseInt(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      console.log("[v0] Install prompt - Days since dismissed:", daysSinceDismissed)
      if (daysSinceDismissed < 7) {
        console.log("[v0] Install prompt - Dismissed recently, not showing")
        setIsWaitingForPrompt(false)
        return
      }
    }

    if (iOS) {
      setIsWaitingForPrompt(false)
      const timer = setTimeout(() => {
        console.log("[v0] Install prompt - Showing iOS prompt after delay")
        setShowPrompt(true)
      }, 5000)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      console.log("[v0] Install prompt - beforeinstallprompt event fired!")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
      setIsWaitingForPrompt(false)
    }

    window.addEventListener("beforeinstallprompt", handler)

    window.addEventListener("appinstalled", () => {
      console.log("[v0] Install prompt - App installed successfully")
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    const timeout = setTimeout(() => {
      if (!deferredPrompt) {
        console.log(
          "[v0] Install prompt - No beforeinstallprompt event after 3s, likely already installed or not supported",
        )
        setIsWaitingForPrompt(false)
        setShowPrompt(false)
      }
    }, 3000)

    console.log("[v0] Install prompt - Waiting for beforeinstallprompt event...")
    console.log("[v0] Install prompt - HTTPS:", window.location.protocol === "https:")
    console.log("[v0] Install prompt - Service Worker support:", "serviceWorker" in navigator)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      clearTimeout(timeout)
    }
  }, [])

  const handleInstall = async () => {
    console.log("[v0] Install prompt - Install clicked, isIOS:", isIOS, "hasDeferredPrompt:", !!deferredPrompt)

    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    if (!deferredPrompt) {
      console.log("[v0] Install prompt - No deferred prompt, showing instructions")
      setShowIOSInstructions(true)
      return
    }

    try {
      console.log("[v0] Install prompt - Triggering native install dialog")
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log("[v0] Install prompt - Install outcome:", outcome)

      if (outcome === "accepted") {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error("[v0] Install prompt - Install error:", error)
    }
  }

  const handleDismiss = () => {
    console.log("[v0] Install prompt - Dismissed by user")
    setShowPrompt(false)
    setShowIOSInstructions(false)
    localStorage.setItem("installPromptDismissed", Date.now().toString())
  }

  if (isInstalled || !showPrompt) {
    return null
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-background rounded-lg p-6 max-w-sm w-full space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg">Install SSELFIE</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">To install SSELFIE on your device:</p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li className="flex items-start gap-2">
                <span className="flex-1">
                  {isIOS ? (
                    <>
                      Tap the <Share className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari
                    </>
                  ) : (
                    "Tap the menu button (⋮) in your browser"
                  )}
                </span>
              </li>
              <li>
                {isIOS ? 'Scroll down and tap "Add to Home Screen"' : 'Select "Add to Home screen" or "Install app"'}
              </li>
              <li>{isIOS ? 'Tap "Add" in the top right corner' : 'Tap "Add" or "Install" to confirm'}</li>
            </ol>
          </div>
          <Button onClick={handleDismiss} className="w-full">
            Got it
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 md:left-auto md:right-4 md:w-96">
      <div className="rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">Install SSELFIE</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {deferredPrompt
                    ? "Install with one tap for the best experience"
                    : isIOS
                      ? "Add to your home screen for the best experience"
                      : "Add to your home screen for quick access"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                {deferredPrompt ? "Install Now" : "Show Instructions"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
