"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FunnelTracker } from "@/components/funnel/FunnelTracker"

export default function NowWhatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const subscriberId = searchParams.get("id")

  const [selections, setSelections] = useState({
    focus: "",
    stuck: "",
    timeline: "",
  })
  const [saved, setSaved] = useState({
    focus: false,
    stuck: false,
    timeline: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelection = async (category: "focus" | "stuck" | "timeline", value: string) => {
    setSelections((prev) => ({ ...prev, [category]: value }))

    // Track signal immediately
    if (subscriberId) {
      try {
        await fetch("/api/blueprint/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriber_id: Number.parseInt(subscriberId),
            signal_type: category,
            value,
          }),
        })
        setSaved((prev) => ({ ...prev, [category]: true }))
        setTimeout(() => setSaved((prev) => ({ ...prev, [category]: false })), 2000)
      } catch (error) {
        console.error("Failed to track signal:", error)
      }
    }
  }

  const handleContinue = () => {
    setIsSubmitting(true)
    router.push(`/blueprint/next-step?email=${email}&id=${subscriberId}`)
  }

  const allSelected = selections.focus && selections.stuck && selections.timeline

  return (
    <>
      <FunnelTracker />
      <div className="min-h-screen bg-stone-50 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="font-serif text-5xl md:text-6xl font-light tracking-wide text-stone-950 mb-4">
              YOUR BLUEPRINT IS READY
            </h1>
            <p className="text-stone-600 text-lg leading-relaxed max-w-2xl mx-auto">
              BEFORE YOU LEAVE, LET'S PERSONALIZE YOUR PATH
            </p>
          </div>

          {/* Personalization Prompts */}
          <div className="space-y-12">
            {/* Question A: Focus */}
            <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
              <h2 className="font-serif text-3xl font-light text-stone-950 mb-6">
                What is your primary focus right now?
              </h2>
              <div className="space-y-3">
                {[
                  "Confidence & Showing Up More",
                  "Building a Personal Brand",
                  "Growing My Business / More Clients",
                ].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelection("focus", option)}
                    className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all ${
                      selections.focus === option
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <span className="text-lg">{option}</span>
                    {saved.focus && selections.focus === option && (
                      <span className="ml-3 text-sm text-stone-300">Saved</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Question B: Stuck */}
            <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
              <h2 className="font-serif text-3xl font-light text-stone-950 mb-6">Where do you feel stuck?</h2>
              <div className="space-y-3">
                {["My content isn't working", "I don't know my message", "I avoid posting because of insecurity"].map(
                  (option) => (
                    <button
                      key={option}
                      onClick={() => handleSelection("stuck", option)}
                      className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all ${
                        selections.stuck === option
                          ? "border-stone-950 bg-stone-950 text-white"
                          : "border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      <span className="text-lg">{option}</span>
                      {saved.stuck && selections.stuck === option && (
                        <span className="ml-3 text-sm text-stone-300">Saved</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Question C: Timeline */}
            <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg">
              <h2 className="font-serif text-3xl font-light text-stone-950 mb-6">How soon do you want results?</h2>
              <div className="space-y-3">
                {["Right now", "Within 30 days", "I'm exploring options"].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelection("timeline", option)}
                    className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all ${
                      selections.timeline === option
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <span className="text-lg">{option}</span>
                    {saved.timeline && selections.timeline === option && (
                      <span className="ml-3 text-sm text-stone-300">Saved</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Final CTA */}
          {allSelected && (
            <div className="mt-12 text-center">
              <button
                onClick={handleContinue}
                disabled={isSubmitting}
                className="inline-block bg-stone-950 text-white px-12 py-4 rounded-md font-serif text-sm tracking-widest uppercase hover:bg-stone-800 transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? "Loading..." : "See Your Personalized Next Step"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
