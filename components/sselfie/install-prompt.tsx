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

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    console.log("[v0] Is standalone:", isStandalone)

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const iOS = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iOS)

    // Check if dismissed recently
    const dismissed = localStorage.getItem("installPromptDismissed")
    if (dismissed) {
      const dismissedTime = Number.parseInt(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      console.log("[v0] Days since dismissed:", daysSinceDismissed)
      if (daysSinceDismissed < 7) {
        console.log("[v0] Install prompt dismissed recently, not showing")
        return
      }
    }

    if (iOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 5000) // Show after 5 seconds on iOS
      return () => clearTimeout(timer)
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handler = (e: Event) => {
      console.log("[v0] beforeinstallprompt event fired!")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      console.log("[v0] App installed successfully")
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log("[v0] Install outcome:", outcome)

      if (outcome === "accepted") {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error("[v0] Install error:", error)
    }
  }

  const handleDismiss = () => {
    console.log("[v0] Install prompt dismissed")
    setShowPrompt(false)
    setShowIOSInstructions(false)
    localStorage.setItem("installPromptDismissed", Date.now().toString())
  }

  useEffect(() => {
    console.log("[v0] Install prompt state:", { isInstalled, showPrompt, hasDeferredPrompt: !!deferredPrompt, isIOS })
  }, [isInstalled, showPrompt, deferredPrompt, isIOS])

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
            <p className="text-sm text-muted-foreground">To install SSELFIE on your iPhone or iPad:</p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li className="flex items-start gap-2">
                <span className="flex-1">
                  Tap the <Share className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari
                </span>
              </li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" in the top right corner</li>
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
                  {isIOS
                    ? "Add to your home screen for the best experience"
                    : "Add to your home screen for quick access and offline use"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleInstall} className="flex-1">
                {isIOS ? "Show Instructions" : "Install"}
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
