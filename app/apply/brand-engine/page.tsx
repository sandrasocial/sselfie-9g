"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function BrandEngineApplicationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    offerType: "cohort",
    revenue: "",
    currentSpend: "",
    biggestBottleneck: "",
    hoursPerWeek: "",
    businessDescription: "",
    whyInterested: "",
    readyToInvest: "",
    sourceChannel: "",
    sourceDetail: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    referrer: "",
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [qualified, setQualified] = useState(true)
  const [score, setScore] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()
    const utmSource = params.get("utm_source") || ""
    const utmMedium = params.get("utm_medium") || ""
    const utmCampaign = params.get("utm_campaign") || ""
    const source = params.get("source") || utmSource || "unknown"
    const sourceDetail = params.get("source_detail") || ""
    const referrer = typeof document !== "undefined" ? document.referrer || "" : ""
    const utmDetail = [utmSource, utmMedium, utmCampaign].filter(Boolean).join("/")

    setFormData((prev) => ({
      ...prev,
      sourceChannel: source.toLowerCase(),
      sourceDetail: sourceDetail || utmDetail,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/apply/brand-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setQualified(data.qualified !== false)
        setScore(typeof data.score === "number" ? data.score : null)
      } else {
        setError(data.error || "Something went wrong. Try again.")
      }
    } catch (err) {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitted && !qualified) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center" style={{ fontFamily: "'Times New Roman', serif" }}>
          <h2 className="text-4xl mb-6">Not Quite Ready Yet</h2>
          <p className="text-lg text-stone-300 mb-8">
            Brand Engine is designed for coaches and creators making $100k+ annually who are currently spending $2k+/month on marketing.
          </p>
          <p className="text-base text-stone-400 mb-12">
            You might be a better fit for <Link href="/" className="underline hover:text-white transition-colors">SSELFIE Studio</Link> — our DIY platform that helps you create authentic content on your own.
          </p>
          <Link href="/" className="inline-block bg-white text-black px-8 py-4 uppercase text-xs tracking-[0.15em] hover:bg-stone-200 transition-colors">
            Explore SSELFIE Studio
          </Link>
        </div>
      </div>
    )
  }

  if (submitted && qualified) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center" style={{ fontFamily: "'Times New Roman', serif" }}>
          <div className="text-6xl mb-6">✓</div>
          <h2 className="text-4xl mb-6">Application Received</h2>
          <p className="text-lg text-stone-300 mb-4">
            Thanks for applying, {formData.name}.
          </p>
          <p className="text-base text-stone-400 mb-12">
            I'll review your application within 24 hours. If you're a good fit, I'll send you a booking link for the next step.
          </p>
          <p className="text-sm text-stone-500">
            Check your email: {formData.email}
          </p>
          {score !== null && (
            <p className="text-xs text-stone-600 mt-3">
              Internal qualification score logged: {score}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <nav className="px-5 py-5 flex justify-between items-center border-b border-white/10">
        <div style={{ fontFamily: "'Times New Roman', serif" }}>
          <Link href="/" className="text-xl tracking-[0.05em]">
            SSELFIE
          </Link>
        </div>
        <Link
          href="/brand-engine"
          className="text-[10px] uppercase tracking-[0.2em] opacity-90 hover:opacity-100 transition-opacity"
        >
          ← Back
        </Link>
      </nav>

      {/* Main Form */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 block mb-4">
            Application
          </span>
          <h1 className="text-5xl mb-6" style={{ fontFamily: "'Times New Roman', serif" }}>
            Brand Engine
          </h1>
          <p className="text-stone-400 text-sm">
            This takes about 5 minutes. I review every application personally.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mb-8 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
                placeholder="Sandra"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Website / Instagram *
              </label>
              <input
                type="text"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
                placeholder="https://instagram.com/yourhandle"
              />
            </div>

            <div>
              <label htmlFor="offerType" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Which offer are you applying for? *
              </label>
              <select
                id="offerType"
                name="offerType"
                value={formData.offerType}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="cohort" style={{ backgroundColor: "#000" }}>Brand Engine Cohort</option>
                <option value="vip" style={{ backgroundColor: "#000" }}>Brand Engine VIP</option>
                <option value="both" style={{ backgroundColor: "#000" }}>Not sure yet (help me choose)</option>
              </select>
            </div>
          </div>

          {/* Qualification Questions */}
          <div className="border-t border-white/10 pt-8 space-y-6">
            <div>
              <label htmlFor="revenue" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Current Annual Revenue *
              </label>
              <select
                id="revenue"
                name="revenue"
                value={formData.revenue}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="" style={{ backgroundColor: "#000" }}>Select one...</option>
                <option value="<50k" style={{ backgroundColor: "#000" }}>Less than $50k</option>
                <option value="50-100k" style={{ backgroundColor: "#000" }}>$50k - $100k</option>
                <option value="100-250k" style={{ backgroundColor: "#000" }}>$100k - $250k</option>
                <option value="250-500k" style={{ backgroundColor: "#000" }}>$250k - $500k</option>
                <option value="500k+" style={{ backgroundColor: "#000" }}>$500k+</option>
              </select>
            </div>

            <div>
              <label htmlFor="currentSpend" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                What do you currently spend per month on content and social media? *
              </label>
              <select
                id="currentSpend"
                name="currentSpend"
                value={formData.currentSpend}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="" style={{ backgroundColor: "#000" }}>Select one...</option>
                <option value="0-500" style={{ backgroundColor: "#000" }}>$0 - $500</option>
                <option value="500-1500" style={{ backgroundColor: "#000" }}>$500 - $1,500</option>
                <option value="1500-3000" style={{ backgroundColor: "#000" }}>$1,500 - $3,000</option>
                <option value="3000+" style={{ backgroundColor: "#000" }}>$3,000+</option>
              </select>
            </div>

            <div>
              <label htmlFor="hoursPerWeek" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                How many hours per week do you spend on content creation and social media? *
              </label>
              <select
                id="hoursPerWeek"
                name="hoursPerWeek"
                value={formData.hoursPerWeek}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="" style={{ backgroundColor: "#000" }}>Select one...</option>
                <option value="5" style={{ backgroundColor: "#000" }}>5 hours or less</option>
                <option value="10" style={{ backgroundColor: "#000" }}>10 hours</option>
                <option value="15" style={{ backgroundColor: "#000" }}>15 hours</option>
                <option value="20+" style={{ backgroundColor: "#000" }}>20+ hours</option>
              </select>
            </div>

            <div>
              <label htmlFor="biggestBottleneck" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                What's your biggest content bottleneck right now? *
              </label>
              <textarea
                id="biggestBottleneck"
                name="biggestBottleneck"
                value={formData.biggestBottleneck}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors resize-none"
                placeholder="Be specific..."
              />
            </div>

            <div>
              <label htmlFor="businessDescription" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Tell me about your business and offers (2-3 sentences) *
              </label>
              <textarea
                id="businessDescription"
                name="businessDescription"
                value={formData.businessDescription}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors resize-none"
                placeholder="What do you do? Who do you serve? What do you sell?"
              />
            </div>

            <div>
              <label htmlFor="whyInterested" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Why are you interested in Brand Engine? *
              </label>
              <textarea
                id="whyInterested"
                name="whyInterested"
                value={formData.whyInterested}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors resize-none"
                placeholder="What are you hoping to get out of this?"
              />
            </div>

            <div>
              <label htmlFor="readyToInvest" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Are you ready to invest in this cycle? (Cohort: €2,000-€2,497, VIP: €3,500-€4,997) *
              </label>
              <select
                id="readyToInvest"
                name="readyToInvest"
                value={formData.readyToInvest}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="" style={{ backgroundColor: "#000" }}>Select one...</option>
                <option value="yes" style={{ backgroundColor: "#000" }}>Yes, I'm ready</option>
                <option value="maybe" style={{ backgroundColor: "#000" }}>I need to think about it</option>
                <option value="no" style={{ backgroundColor: "#000" }}>No, just exploring</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-white/10 pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 uppercase text-xs tracking-[0.15em] hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
            <p className="text-xs text-stone-500 mt-4 text-center">
              I review every application personally within 24 hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
