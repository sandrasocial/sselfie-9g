"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

interface SubscriberData {
  email: string
  name: string
  readiness_label: string
  intent_score: number
  focus: string
  stuck: string
  timeline: string
  maya_alignment_notes: string
}

export default function NextStepPage() {
  const searchParams = useSearchParams()
  const subscriberId = searchParams.get("id")
  const [data, setData] = useState<SubscriberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (subscriberId) {
      fetch(`/api/blueprint/next-step?id=${subscriberId}`)
        .then((res) => res.json())
        .then((result) => {
          setData(result.data)
          setLoading(false)
        })
        .catch((error) => {
          console.error("Failed to load next step data:", error)
          setLoading(false)
        })
    }
  }, [subscriberId])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-stone-950 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-600">Unable to load recommendations</p>
      </div>
    )
  }

  const isHot = data.readiness_label === "hot"
  const isWarm = data.readiness_label === "warm"
  const isCold = data.readiness_label === "cold"

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl font-light tracking-wide text-stone-950 mb-4">
            HERE'S YOUR
            <br />
            STRATEGIC PATH FORWARD
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed max-w-2xl mx-auto">
            Based on your Blueprint and selections, here's what we recommend next
          </p>
        </div>

        {/* Personalized Section */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg mb-8">
          <h2 className="font-serif text-3xl font-light text-stone-950 mb-6">YOUR PROFILE</h2>
          <div className="space-y-4 text-stone-700">
            <p>
              <strong>Focus:</strong> {data.focus}
            </p>
            <p>
              <strong>Challenge:</strong> {data.stuck}
            </p>
            <p>
              <strong>Timeline:</strong> {data.timeline}
            </p>
            <p>
              <strong>Readiness Level:</strong> <span className="uppercase font-bold">{data.readiness_label}</span> (
              {data.intent_score} pts)
            </p>
          </div>
        </div>

        {/* Maya Alignment Notes */}
        {data.maya_alignment_notes && (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-lg mb-8">
            <h2 className="font-serif text-3xl font-light text-stone-950 mb-6">MAYA'S BRAND DIRECTION NOTES</h2>
            <div className="text-stone-700 leading-relaxed whitespace-pre-wrap">{data.maya_alignment_notes}</div>
          </div>
        )}

        {/* Dynamic CTA Logic */}
        <div className="bg-stone-950 text-white rounded-2xl p-12 text-center">
          {isHot && (
            <>
              <h2 className="font-serif text-4xl font-light mb-4">YOU'RE READY TO BUILD</h2>
              <p className="text-stone-300 mb-8 max-w-xl mx-auto">
                Your Blueprint shows you're prepared to bring this to life. SSELFIE Studio gives you everything you need
                to execute immediately.
              </p>
              <Link
                href="/beta"
                className="inline-block bg-white text-stone-950 px-12 py-4 rounded-md font-serif text-sm tracking-widest uppercase hover:bg-stone-100 transition-all duration-200"
              >
                Join SSELFIE Studio Now
              </Link>
            </>
          )}

          {isWarm && (
            <>
              <h2 className="font-serif text-4xl font-light mb-4">LET'S TALK STRATEGY</h2>
              <p className="text-stone-300 mb-8 max-w-xl mx-auto">
                You're close to being ready. Book a brief call with Maya to map your next steps and see if SSELFIE
                Studio is right for you.
              </p>
              <Link
                href="mailto:hello@sselfie.app?subject=Blueprint Strategy Call"
                className="inline-block bg-white text-stone-950 px-12 py-4 rounded-md font-serif text-sm tracking-widest uppercase hover:bg-stone-100 transition-all duration-200"
              >
                Book a Call with Maya
              </Link>
            </>
          )}

          {isCold && (
            <>
              <h2 className="font-serif text-4xl font-light mb-4">START WITH THE FOUNDATION</h2>
              <p className="text-stone-300 mb-8 max-w-xl mx-auto">
                Your Blueprint is just the beginning. Read this guide to understand how to use your insights
                strategically before jumping into execution.
              </p>
              <Link
                href="/resources/blueprint-guide"
                className="inline-block bg-white text-stone-950 px-12 py-4 rounded-md font-serif text-sm tracking-widest uppercase hover:bg-stone-100 transition-all duration-200"
              >
                Read the Blueprint Guide
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
