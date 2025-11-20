"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Grid3x3, Loader2, ChevronRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import useSWR, { mutate } from "swr"
import UnifiedLoading from "../sselfie/unified-loading"
import InstagramFeedView from "./instagram-feed-view"

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

  const { data: brandData, isLoading: brandLoading } = useSWR("/api/profile/personal-brand", fetcher)
  const { data: feedStatus } = useSWR("/api/feed-planner/status", fetcher)

  const { data: feedData } = useSWR(currentFeedId ? `/api/feed/${currentFeedId}` : null, fetcher)

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
        throw new Error("Failed to enhance goal")
      }

      const data = await response.json()
      setUserRequest(data.enhancedGoal)

      toast({
        title: "Enhanced by Maya",
        description: "Your feed goal is now more detailed",
      })
    } catch (error) {
      console.error("[v0] Enhance error:", error)
      toast({
        title: "Enhancement failed",
        description: "Please try again",
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

    setCreationStep("Analyzing your feed goal...")
    setTimeout(() => setCreationStep("Designing your grid layout..."), 2000)
    setTimeout(() => setCreationStep("Maya is creating image concepts..."), 5000)
    setTimeout(() => setCreationStep("Writing captions..."), 9000)
    setTimeout(() => setCreationStep("Building your growth strategy..."), 12000)
    setTimeout(() => setCreationStep("Starting image generation..."), 15000)

    try {
      const response = await fetch("/api/feed-planner/create-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: userRequest }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create strategy")
      }

      const data = await response.json()
      setCurrentFeedId(data.feedPlan.feedLayoutId)
      setStep("view")

      await mutate("/api/feed-planner/status")

      toast({
        title: "Creating your feed",
        description: "Generating 9 photos... This takes about 5 minutes",
      })
    } catch (error) {
      console.error("Error creating strategy:", error)
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
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

  if (brandLoading || isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <UnifiedLoading message="Loading..." />
      </div>
    )
  }

  if (!brandData?.exists || !brandData?.completed) {
    return (
      <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-28 md:pb-32 overflow-x-hidden max-w-full px-4 sm:px-0">
        <div className="pt-4 sm:pt-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extralight tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase leading-none mb-2 sm:mb-3">
            Feed Planner
          </h1>
          <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-stone-400">
            Instagram Strategy
          </p>
        </div>

        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center shadow-xl shadow-stone-900/5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/70 backdrop-blur-2xl rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-white/80 shadow-lg shadow-stone-900/5">
            <Grid3x3 size={28} className="sm:w-8 sm:h-8 text-stone-900" strokeWidth={1.5} />
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-3 sm:mb-4">
            Complete Your Profile
          </h2>

          <p className="text-sm sm:text-base font-light text-stone-500 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
            We need your brand profile to design your feed
          </p>

          <button
            onClick={() => (window.location.href = "/studio")}
            className="group relative bg-stone-900 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 min-h-[52px] sm:min-h-[60px] overflow-hidden w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Go to Studio
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                className="group-hover:translate-x-1 transition-transform duration-500"
              />
            </span>
          </button>
        </div>
      </div>
    )
  }

  if (isCreatingStrategy) {
    return (
      <div className="h-screen bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-stone-100/40 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-stone-200/30 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="relative z-10 text-center px-6 sm:px-8">
          <div className="mb-12 sm:mb-16 relative w-32 h-32 sm:w-40 sm:h-40 mx-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
                style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2 sm:p-2.5">
                <img src="/icon-192.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-stone-950 text-2xl sm:text-3xl font-serif font-extralight tracking-[0.3em] uppercase">
              Creating Your Feed
            </h1>

            <div className="flex items-center gap-3 justify-center">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"></div>
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
              <p className="text-sm font-light text-stone-600">{creationStep}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "view" && feedData) {
    return (
      <div className="space-y-4 sm:space-y-6">
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
      </div>
    )
  }

  if (step === "request") {
    return (
      <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-28 md:pb-32 overflow-x-hidden max-w-full px-4 sm:px-0">
        <div className="pt-4 sm:pt-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extralight tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase leading-none mb-2 sm:mb-3">
            Feed Planner
          </h1>
          <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-stone-400">
            Strategic 9-Post Grid
          </p>
        </div>

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
              <Textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                placeholder="Describe your Instagram feed..."
                className="min-h-[180px] text-sm font-light bg-white/60 backdrop-blur-2xl border border-white/70 rounded-xl focus:border-stone-900/20 focus:ring-2 focus:ring-stone-900/10 resize-none"
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-light text-stone-400">{userRequest.length}/1000</p>
                <p className="text-xs font-light text-stone-400">From your profile</p>
              </div>
            </div>

            {showCreditWarning && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-light text-stone-900 tracking-wide">Create Your Feed Strategy</h3>
                  <p className="text-xs font-light text-stone-600 leading-relaxed">
                    This will generate 9 AI photos for your Instagram feed using 15 credits. You can regenerate
                    individual posts later if needed.
                  </p>
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
                    Use 15 Credits
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
                      Creating Your Strategy
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
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <UnifiedLoading message="Loading..." />
    </div>
  )
}
