"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Grid3x3, Loader2, ChevronRight, Menu, Home, Camera, MessageCircle, Grid, Settings, LogOut, Sliders, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import useSWR, { mutate } from "swr"
import UnifiedLoading from "../sselfie/unified-loading"
import InstagramFeedView from "./instagram-feed-view"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FeedPlannerScreen() {
  const [step, setStep] = useState<"request" | "view">("request")
  const [userRequest, setUserRequest] = useState("")
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [currentFeedId, setCurrentFeedId] = useState<number | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCreditWarning, setShowCreditWarning] = useState(false)
  const [creationStep, setCreationStep] = useState<string>("")
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Generation settings (same defaults as Maya screen)
  const [styleStrength, setStyleStrength] = useState(1.0)
  const [promptAccuracy, setPromptAccuracy] = useState(3.5)
  const [aspectRatio, setAspectRatio] = useState("4:5")
  const [realismStrength, setRealismStrength] = useState(0.2)

  const router = useRouter()
  
  // Load settings from localStorage on mount (same as Maya screen)
  useEffect(() => {
    const settingsStr = localStorage.getItem("mayaGenerationSettings")
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr)
        console.log("[v0] Feed Planner: Loaded saved settings from localStorage:", settings)
        const loadedStyleStrength = settings.styleStrength ?? 1.0
        setStyleStrength(loadedStyleStrength === 1.1 ? 1.0 : loadedStyleStrength)
        setPromptAccuracy(settings.promptAccuracy || 3.5)
        setAspectRatio(settings.aspectRatio || "4:5")
        const loadedRealismStrength = settings.realismStrength ?? 0.2
        setRealismStrength(loadedRealismStrength === 0.4 ? 0.2 : loadedRealismStrength)
      } catch (error) {
        console.error("[v0] Feed Planner: Error loading settings:", error)
      }
    } else {
      console.log("[v0] Feed Planner: No saved settings found, using defaults")
    }
  }, [])

  // Save settings to localStorage when they change (same as Maya screen)
  useEffect(() => {
    const settings = {
      styleStrength,
      promptAccuracy,
      aspectRatio,
      realismStrength,
    }
    localStorage.setItem("mayaGenerationSettings", JSON.stringify(settings))
  }, [styleStrength, promptAccuracy, aspectRatio, realismStrength])

  const { data: brandData, isLoading: brandLoading } = useSWR("/api/profile/personal-brand", fetcher)
  const { data: feedStatus } = useSWR("/api/feed-planner/status", fetcher)

  // Auto-refresh feed data every 5 seconds when viewing feed to show real-time progress
  const { data: feedData, error: feedError } = useSWR(
    currentFeedId ? `/api/feed/${currentFeedId}` : null,
    fetcher,
    currentFeedId && step === "view"
      ? {
          refreshInterval: 3000, // Poll every 3 seconds for faster updates
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          onError: (error) => {
            console.error("[v0] Feed data fetch error:", error)
          },
        }
      : {},
  )

  useEffect(() => {
    if (feedStatus && !isCheckingStatus) return

    if (feedStatus?.hasStrategy && feedStatus?.feedStrategy) {
      console.log("[v0] Found existing feed strategy:", feedStatus.feedStrategy.id)
      setCurrentFeedId(feedStatus.feedStrategy.id)
      setStep("view")
      setIsCheckingStatus(false)
    } else if (feedStatus && !feedStatus.hasStrategy) {
      console.log("[v0] No existing feed strategy, showing request form")
      setIsCheckingStatus(false)
    }
  }, [feedStatus, isCheckingStatus])

  useEffect(() => {
    if (brandData?.exists && brandData?.data && !userRequest && !feedStatus?.hasStrategy) {
      const { name, businessType, targetAudience, photoGoals, contentPillars, visualAesthetic } = brandData.data

      let autoRequest = ""

      if (businessType) {
        autoRequest += `I'm ${name || "a " + businessType}`
      }

      if (targetAudience) {
        autoRequest += ` helping ${targetAudience}`
      }

      if (photoGoals) {
        autoRequest += `. ${photoGoals}`
      }

      if (visualAesthetic) {
        try {
          const aesthetics = JSON.parse(visualAesthetic)
          if (aesthetics.length > 0) {
            autoRequest += ` My visual style is ${aesthetics.join(" and ")}.`
          }
        } catch (e) {}
      }

      if (contentPillars) {
        try {
          const pillars = JSON.parse(contentPillars)
          if (pillars.length > 0) {
            const pillarNames = pillars
              .map((p: any) => p.name)
              .slice(0, 3)
              .join(", ")
            autoRequest += ` I post about: ${pillarNames}.`
          }
        } catch (e) {}
      }

      if (autoRequest) {
        setUserRequest(autoRequest.trim())
      }
    }
  }, [brandData, userRequest, feedStatus])

  const handleEnhanceGoal = async () => {
    if (!userRequest.trim()) {
      toast({
        title: "Write something first",
        description: "Add your feed goal so Maya can enhance it",
        variant: "destructive",
      })
      return
    }

    setIsEnhancing(true)

    try {
      const response = await fetch("/api/feed-planner/enhance-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText: userRequest }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Failed to enhance goal"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (data.enhancedGoal) {
        setUserRequest(data.enhancedGoal)
        setIsEditingGoal(false) // Show preview after enhancement
        toast({
          title: "Enhanced by Maya",
          description: "Your feed goal is now more detailed. You can edit it further if needed.",
        })
      } else {
        throw new Error("No enhanced goal returned")
      }
    } catch (error) {
      console.error("[v0] Enhance error:", error)
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleCreateStrategy = async () => {
    if (!userRequest.trim()) {
      toast({
        title: "Tell us what you want",
        description: "Describe your Instagram feed",
        variant: "destructive",
      })
      return
    }

    if (!showCreditWarning) {
      setShowCreditWarning(true)
      return
    }

    setIsCreatingStrategy(true)
    setShowCreditWarning(false)
    setCreationStep("Creating your feed strategy...")

    try {
      // Get current settings from state
      const customSettings = {
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength,
        extraLoraScale: realismStrength, // Map realismStrength to extraLoraScale
      }

      const response = await fetch("/api/feed-planner/create-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          request: userRequest,
          customSettings, // Pass settings to API
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create strategy")
      }

      const data = await response.json()
      console.log("[v0] Strategy creation response:", data)
      
      if (!data.feedLayoutId) {
        console.error("[v0] No feedLayoutId in response:", data)
        throw new Error("Failed to create feed strategy - no feed ID returned")
      }

      console.log("[v0] Setting currentFeedId to:", data.feedLayoutId)
      setCurrentFeedId(data.feedLayoutId)
      setStep("view")

      // Wait a moment for database to be ready, then fetch feed data
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      await mutate("/api/feed-planner/status")
      await mutate(`/api/feed/${data.feedLayoutId}`)
      
      console.log("[v0] Feed data should now be loading for ID:", data.feedLayoutId)

      toast({
        title: "Feed strategy created!",
        description: "Your 9 images are being generated automatically. This takes about 5-10 minutes.",
      })
    } catch (error) {
      console.error("Error creating strategy:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create feed strategy"
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage
      if (errorMessage.includes("credits")) {
        userFriendlyMessage = "You don't have enough credits. Please purchase more credits to continue."
      } else if (errorMessage.includes("personal brand")) {
        userFriendlyMessage = "Please complete your personal brand profile first in Settings."
      } else if (errorMessage.includes("trained model")) {
        userFriendlyMessage = "You need to train your model first. Go to Training to get started."
      }
      
      toast({
        title: "Failed to create feed",
        description: userFriendlyMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsCreatingStrategy(false)
      setCreationStep("")
    }
  }

  const handleDeleteStrategy = async () => {
    if (!confirm("Are you sure you want to delete your current feed strategy? This cannot be undone.")) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch("/api/feed-planner/delete-strategy", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to delete strategy")
      }

      setCurrentFeedId(null)
      setStep("request")
      await mutate("/api/feed-planner/status")

      toast({
        title: "Strategy deleted",
        description: "You can now create a new feed strategy",
      })
    } catch (error) {
      console.error("[v0] Delete error:", error)
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (response.ok) {
        window.location.href = "/"
      } else {
        throw new Error("Logout failed")
      }
    } catch (error) {
      console.error("[v0] Logout error:", error)
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      })
      setIsLoggingOut(false)
    }
  }

  if (isCheckingStatus || brandLoading) {
    return <UnifiedLoading message="Loading feed planner..." />
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="p-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-foreground" />
            <h1 className="text-lg font-semibold">Feed Planner</h1>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {showNavMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNavMenu(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r z-50 shadow-xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-8">Menu</h2>
              <nav className="space-y-4">
                <button
                  onClick={() => {
                    router.push("/studio")
                    setShowNavMenu(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => {
                    router.push("/studio?tab=gallery")
                    setShowNavMenu(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span>Gallery</span>
                </button>
                <button
                  onClick={() => {
                    router.push("/studio?tab=maya")
                    setShowNavMenu(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat with Maya</span>
                </button>
                <button
                  onClick={() => {
                    router.push("/studio?tab=feed-planner")
                    setShowNavMenu(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-accent"
                >
                  <Grid className="w-5 h-5" />
                  <span className="font-medium">Feed Planner</span>
                </button>
                <button
                  onClick={() => {
                    router.push("/studio?tab=settings")
                    setShowNavMenu(false)
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors mt-8"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      {step === "request" && (
        <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-28 md:pb-32 overflow-x-hidden max-w-full px-4 sm:px-0">
          <div className="pt-4 sm:pt-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extralight tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase leading-none mb-2 sm:mb-3">
              Feed Planner
            </h1>
            <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-stone-400 mb-4">
              Strategic 9-Post Grid
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
            >
              What is Feed Planner?
            </button>
          </div>

          {showOnboarding && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowOnboarding(false)}>
              <div
                className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-serif font-light tracking-wide text-stone-900 mb-4">What is Feed Planner?</h2>
                <div className="space-y-3 text-sm text-stone-600 leading-relaxed">
                  <p>
                    Feed Planner creates a complete <strong>9-post Instagram feed</strong> with AI-generated images, captions, and a strategic layout.
                  </p>
                  <p>
                    <strong>What you get:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>9 personalized AI photos featuring you</li>
                    <li>Engaging captions for each post</li>
                    <li>Strategic 3x3 grid layout</li>
                    <li>Hashtag suggestions</li>
                    <li>Complete feed strategy document</li>
                  </ul>
                  <p className="pt-2">
                    <strong>Cost:</strong> 14 credits (5 for strategy + 9 for images)
                  </p>
                  <p className="pt-2 text-xs text-stone-500">
                    Images are generated automatically and take about 5-10 minutes to complete.
                  </p>
                </div>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full bg-stone-900 text-white px-6 py-3 rounded-lg text-sm font-light tracking-wide hover:bg-stone-800 transition-colors mt-4"
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-2xl border border-white/70 rounded-xl p-4 shadow-lg shadow-stone-900/5">
                <p className="text-sm font-light text-stone-600 leading-relaxed">
                  We loaded your brand profile. Feel free to edit or keep as-is.
                </p>
              </div>

              <div>
                <label className="block text-xs tracking-[0.2em] uppercase font-light text-stone-500 mb-3">
                  What's Your Feed Goal?
                </label>
                {!isEditingGoal && userRequest.trim() ? (
                  <div
                    onClick={() => !isEnhancing && setIsEditingGoal(true)}
                    className={`min-h-[180px] text-sm font-light bg-white/60 backdrop-blur-2xl border border-white/70 rounded-xl p-4 ${
                      !isEnhancing ? "cursor-text hover:border-stone-900/30 transition-colors" : ""
                    }`}
                  >
                    <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:text-stone-900 prose-p:text-stone-700 prose-p:leading-relaxed prose-strong:text-stone-900 prose-strong:font-medium prose-ul:text-stone-700 prose-li:text-stone-700 prose-li:leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-lg font-serif font-light text-stone-900 mb-3" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-base font-serif font-light text-stone-900 mb-2 mt-4" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-sm font-light text-stone-700 leading-relaxed mb-2" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-medium text-stone-900" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside space-y-1 ml-2 mb-2" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1 ml-2 mb-2" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-sm font-light text-stone-700 leading-relaxed" {...props} />
                          ),
                        }}
                      >
                        {userRequest}
                      </ReactMarkdown>
                    </div>
                    {!isEnhancing && (
                      <p className="text-xs font-light text-stone-400 mt-2 italic">Click to edit</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={userRequest}
                    onChange={(e) => {
                      if (!isEnhancing) {
                        setUserRequest(e.target.value)
                      }
                    }}
                    onBlur={() => {
                      // Only exit edit mode if there's content, otherwise keep it open
                      if (userRequest.trim()) {
                        setIsEditingGoal(false)
                      }
                    }}
                    onFocus={() => setIsEditingGoal(true)}
                    placeholder="Describe your Instagram feed..."
                    className="min-h-[180px] text-sm font-light bg-white/60 backdrop-blur-2xl border border-white/70 rounded-xl focus:border-stone-900/20 focus:ring-2 focus:ring-stone-900/10 resize-none"
                    maxLength={3000}
                    readOnly={isEnhancing}
                    autoFocus={isEditingGoal}
                  />
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-light text-stone-400">{userRequest.length}/3000</p>
                  {isEnhancing ? (
                    <p className="text-xs font-light text-stone-400">Enhancing with Maya...</p>
                  ) : (
                    <p className="text-xs font-light text-stone-400">From your profile</p>
                  )}
                </div>
              </div>

              {/* Generation Settings */}
              <div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center justify-between w-full bg-white/60 backdrop-blur-2xl border border-white/70 rounded-xl p-4 hover:border-stone-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sliders size={18} className="text-stone-600" strokeWidth={2} />
                    <div className="text-left">
                      <label className="block text-xs tracking-[0.2em] uppercase font-light text-stone-500 mb-1">
                        Generation Settings
                      </label>
                      <p className="text-xs font-light text-stone-600">
                        Style: {styleStrength.toFixed(2)} • Accuracy: {promptAccuracy.toFixed(1)} • Realism: {realismStrength.toFixed(2)} • Ratio: {aspectRatio}
                      </p>
                    </div>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className={`text-stone-400 transition-transform ${showSettings ? 'rotate-90' : ''}`} 
                  />
                </button>

                {showSettings && (
                  <div className="mt-4 bg-white/60 backdrop-blur-2xl border border-white/70 rounded-xl p-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs tracking-wider uppercase text-stone-600">Style Strength</label>
                        <span className="text-sm font-medium text-stone-950">{styleStrength.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.9"
                        max="1.2"
                        step="0.05"
                        value={styleStrength}
                        onChange={(e) => setStyleStrength(Number.parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs tracking-wider uppercase text-stone-600">Prompt Accuracy</label>
                        <span className="text-sm font-medium text-stone-950">{promptAccuracy.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="2.5"
                        max="5.0"
                        step="0.5"
                        value={promptAccuracy}
                        onChange={(e) => setPromptAccuracy(Number.parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs tracking-wider uppercase text-stone-600">Realism Boost</label>
                        <span className="text-sm font-medium text-stone-950">{realismStrength.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.8"
                        step="0.1"
                        value={realismStrength}
                        onChange={(e) => setRealismStrength(Number.parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-stone-500 mt-1">Higher = more photorealistic, lower = more stylized</p>
                    </div>

                    <div>
                      <label className="text-xs tracking-wider uppercase text-stone-600 mb-2 block">Aspect Ratio</label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                      >
                        <option value="1:1">Square (1:1)</option>
                        <option value="4:5">Portrait (4:5)</option>
                        <option value="16:9">Landscape (16:9)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {showCreditWarning && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-light text-stone-900 tracking-wide">Create Your Feed Strategy</h3>
                    <p className="text-xs font-light text-stone-600 leading-relaxed">
                      This will create a complete 9-post Instagram feed strategy and automatically generate all images.
                    </p>
                    <div className="bg-white/60 border border-stone-200/60 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Strategy creation</span>
                        <span className="font-medium text-stone-900">5 credits</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">9 AI images</span>
                        <span className="font-medium text-stone-900">9 credits</span>
                      </div>
                      <div className="border-t border-stone-200 pt-1.5 mt-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-900">Total</span>
                        <span className="text-sm font-semibold text-stone-950">14 credits</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreditWarning(false)}
                      className="flex-1 bg-white text-stone-700 border border-stone-200 px-6 py-3 rounded-lg text-xs font-light tracking-wide hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateStrategy}
                      className="flex-1 bg-stone-900 text-white px-6 py-3 rounded-lg text-xs font-light tracking-wide hover:bg-stone-800 transition-colors"
                    >
                      Use 14 Credits
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleEnhanceGoal}
                  disabled={isEnhancing || !userRequest.trim()}
                  className="group relative bg-white/60 backdrop-blur-2xl text-stone-900 border border-white/60 px-6 py-4 rounded-xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-105 active:scale-95 min-h-[60px] overflow-hidden flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-stone-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isEnhancing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" strokeWidth={1.5} />
                        Enhancing with Maya
                      </>
                    ) : (
                      "Enhance with Maya"
                    )}
                  </span>
                </button>

                <button
                  onClick={handleCreateStrategy}
                  disabled={isCreatingStrategy || !userRequest.trim()}
                  className="group relative bg-stone-900 text-white px-8 py-5 rounded-xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 min-h-[60px] overflow-hidden flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isCreatingStrategy ? (
                      <>
                        <Loader2 size={16} className="animate-spin" strokeWidth={1.5} />
                        {creationStep || "Creating Strategy..."}
                      </>
                    ) : (
                      <>
                        Create Feed Strategy
                        <ChevronRight
                          size={14}
                          strokeWidth={1.5}
                          className="group-hover:translate-x-1 transition-transform duration-500"
                        />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "view" && (
        <div className="space-y-4 sm:space-y-6">
          {feedError ? (
            <div className="flex items-center justify-center min-h-[400px] p-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-stone-600">Failed to load feed. Please try again.</p>
                <button
                  onClick={() => {
                    setStep("request")
                    setCurrentFeedId(null)
                  }}
                  className="text-sm text-stone-500 hover:text-stone-900 underline"
                >
                  Go back
                </button>
              </div>
            </div>
          ) : !feedData ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <UnifiedLoading message="Loading your feed..." />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 sm:px-0">
                <button
                  onClick={() => {
                    setStep("request")
                    setCurrentFeedId(null)
                  }}
                  className="text-sm font-light text-stone-500 hover:text-stone-900 transition-colors"
                >
                  ← Back to Request
                </button>

                <button
                  onClick={handleDeleteStrategy}
                  disabled={isDeleting}
                  className="text-sm font-light text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete Strategy"}
                </button>
              </div>

              <InstagramFeedView
                feedData={feedData}
                onBack={() => {
                  setStep("request")
                  setCurrentFeedId(null)
                  setUserRequest("")
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
