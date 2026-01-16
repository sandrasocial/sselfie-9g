"use client"

import { useState, useEffect } from "react"
import { Download, Share, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface InstallButtonProps {
  variant?: "default" | "menu"
}

export function InstallButton({ variant = "default" }: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    setIsPreview(window.location.hostname.includes("vusercontent.net"))

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)
    console.log("[v0] Install button - Is standalone:", isStandalone)

    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    setIsAndroid(/android/.test(userAgent))

    const handler = (e: Event) => {
      console.log("[v0] Install button - beforeinstallprompt event captured!")
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)

    window.addEventListener("appinstalled", () => {
      console.log("[v0] Install button - App installed successfully")
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        console.log("[v0] Install button - Service worker registered:", !!reg)
      })
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    console.log("[v0] Install button clicked - deferredPrompt:", !!deferredPrompt, "isIOS:", isIOS)

    if (deferredPrompt) {
      try {
        console.log("[v0] Triggering native install prompt")
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log("[v0] Install outcome:", outcome)
        if (outcome === "accepted") {
          setDeferredPrompt(null)
          setShowDialog(false)
        }
      } catch (error) {
        console.error("[v0] Install error:", error)
        setShowDialog(true)
      }
    } else {
      console.log("[v0] No deferred prompt available, showing instructions")
      setShowDialog(true)
    }
  }

  if (isInstalled) {
    return null
  }

  if (variant === "menu") {
    return (
      <>
        <button onClick={handleInstall} className="flex items-center gap-2 w-full text-sm px-2 py-1.5">
          <Download size={16} />
          <span>Install App</span>
        </button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Install SSELFIE
              </DialogTitle>
              <DialogDescription>
                {isPreview
                  ? "PWA installation is only available in production. Deploy to sselfie.ai to enable native app installation."
                  : "Add SSELFIE to your home screen for quick access and offline use"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {isPreview ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    The preview environment has limitations that prevent service worker registration. Once deployed to
                    production (sselfie.ai), users will be able to install the app natively with one click.
                  </p>
                </div>
              ) : (
                <>
                  {isIOS && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">For iPhone/iPad:</p>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li className="flex items-start gap-2">
                          <span className="flex-1">
                            Tap the <Share className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari
                          </span>
                        </li>
                        <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                        <li>Tap &quot;Add&quot; in the top right corner</li>
                      </ol>
                    </div>
                  )}

                  {isAndroid && !deferredPrompt && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">For Android:</p>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li className="flex items-start gap-2">
                          <span className="flex-1">
                            Tap the <MoreVertical className="inline h-4 w-4 mx-1" /> menu button in your browser
                          </span>
                        </li>
                        <li>Select &quot;Add to Home screen&quot; or &quot;Install app&quot;</li>
                        <li>Tap &quot;Add&quot; or &quot;Install&quot; to confirm</li>
                      </ol>
                    </div>
                  )}

                  {!isIOS && !isAndroid && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">For Desktop:</p>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>Look for the install icon in your browser&apos;s address bar</li>
                        <li>Click it and select &quot;Install&quot;</li>
                        <li>Or use your browser&apos;s menu: Settings → Install SSELFIE</li>
                      </ol>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowDialog(false)}>Got it</Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleInstall}
        className="gap-2 text-xs tracking-[0.15em] uppercase font-light"
      >
        <Download size={14} />
        Install App
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Install SSELFIE
            </DialogTitle>
            <DialogDescription>
              {isPreview
                ? "PWA installation is only available in production. Deploy to sselfie.ai to enable native app installation."
                : "Add SSELFIE to your home screen for quick access and offline use"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isPreview ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The preview environment has limitations that prevent service worker registration. Once deployed to
                  production (sselfie.ai), users will be able to install the app natively with one click.
                </p>
              </div>
            ) : (
              <>
                {isIOS && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">For iPhone/iPad:</p>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li className="flex items-start gap-2">
                        <span className="flex-1">
                          Tap the <Share className="inline h-4 w-4 mx-1" /> Share button at the bottom of Safari
                        </span>
                      </li>
                      <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                      <li>Tap &quot;Add&quot; in the top right corner</li>
                    </ol>
                  </div>
                )}

                {isAndroid && !deferredPrompt && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">For Android:</p>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li className="flex items-start gap-2">
                        <span className="flex-1">
                          Tap the <MoreVertical className="inline h-4 w-4 mx-1" /> menu button in your browser
                        </span>
                      </li>
                      <li>Select &quot;Add to Home screen&quot; or &quot;Install app&quot;</li>
                      <li>Tap &quot;Add&quot; or &quot;Install&quot; to confirm</li>
                    </ol>
                  </div>
                )}

                {!isIOS && !isAndroid && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">For Desktop:</p>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Look for the install icon in your browser&apos;s address bar</li>
                      <li>Click it and select &quot;Install&quot;</li>
                      <li>Or use your browser&apos;s menu: Settings → Install SSELFIE</li>
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowDialog(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
