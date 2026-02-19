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
  const [error, setError] = useState("")
  const [followUpPath, setFollowUpPath] = useState<"checkout" | "payment" | "booking" | "next_step">("next_step")

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()
    const offerTypeParam = (params.get("offerType") || "").toLowerCase()
    const offerType =
      offerTypeParam === "vip" || offerTypeParam === "cohort" || offerTypeParam === "both"
        ? offerTypeParam
        : "cohort"
    const utmSource = params.get("utm_source") || ""
    const utmMedium = params.get("utm_medium") || ""
    const utmCampaign = params.get("utm_campaign") || ""
    const sourceChannel =
      params.get("sourceChannel") ||
      params.get("source_channel") ||
      params.get("source") ||
      (utmMedium.toLowerCase() === "manychat" ? "manychat_dm" : "") ||
      utmSource ||
      "unknown"
    const sourceDetail = params.get("sourceDetail") || params.get("source_detail") || ""
    const referrer = typeof document !== "undefined" ? document.referrer || "" : ""
    const utmDetail = [utmSource, utmMedium, utmCampaign].filter(Boolean).join("/")

    setFormData((prev) => ({
      ...prev,
      offerType,
      sourceChannel: sourceChannel.toLowerCase(),
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
        if (data?.routingPath === "direct_offer") {
          setFollowUpPath(data?.checkoutMode === "embedded_checkout" ? "checkout" : "payment")
        } else if (data?.qualified) {
          setFollowUpPath("booking")
        } else {
          setFollowUpPath("next_step")
        }
        setSubmitted(true)
      } else {
        setError(data.error || "Something went wrong. Please try again in a minute.")
      }
    } catch {
      setError("Something went wrong. Please try again in a minute.")
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center" style={{ fontFamily: "'Times New Roman', serif" }}>
          <div className="text-6xl mb-6">✓</div>
          <h2 className="text-4xl mb-6">You&apos;re in.</h2>
          <p className="text-lg text-stone-300 mb-4">
            Got your application, {formData.name}.
          </p>
          <p className="text-base text-stone-400 mb-12">
            No pressure. I&apos;ll review this personally within 24 hours.
            <br />
            {followUpPath === "checkout"
              ? "If it's a fit, I'll send your checkout link."
              : followUpPath === "payment"
              ? "If it's a fit, I'll send your payment link."
              : followUpPath === "booking"
                ? "If it's a fit, I'll send your booking link."
                : "If it's a fit, I'll send your next step."}
          </p>
          <p className="text-sm text-stone-500">
            Check your email: {formData.email}
          </p>
          <p className="text-sm text-stone-500 mt-2">
            You&apos;ve got this.
          </p>
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
          ← Back to Cohort
        </Link>
      </nav>

      {/* Main Form */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 block mb-4">
            Application
          </span>
          <h1 className="text-5xl mb-6" style={{ fontFamily: "'Times New Roman', serif" }}>
            Apply for Cohort
          </h1>
          <p className="text-stone-400 text-sm">
            This takes about 4 minutes.
            <br />
            Let&apos;s make this easy.
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
                Your name *
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
                Best email *
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
                Instagram or website *
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
                Which path feels right? *
              </label>
              <select
                id="offerType"
                name="offerType"
                value={formData.offerType}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="cohort" style={{ backgroundColor: "#000" }}>Cohort (main path)</option>
                <option value="vip" style={{ backgroundColor: "#000" }}>VIP (1:1)</option>
                <option value="both" style={{ backgroundColor: "#000" }}>Not sure yet</option>
              </select>
            </div>
          </div>

          {/* Qualification Questions */}
          <div className="border-t border-white/10 pt-8 space-y-6">
            <p className="text-xs text-stone-500 mb-4">
              These questions help me see if this is the right fit for you right now.
            </p>
            <div>
              <label htmlFor="revenue" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Where are you at in yearly revenue? *
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
                <option value="<50k" style={{ backgroundColor: "#000" }}>Below €50k</option>
                <option value="50-100k" style={{ backgroundColor: "#000" }}>€50k - €100k</option>
                <option value="100-250k" style={{ backgroundColor: "#000" }}>€100k - €250k</option>
                <option value="250-500k" style={{ backgroundColor: "#000" }}>€250k - €500k</option>
                <option value="500k+" style={{ backgroundColor: "#000" }}>€500k+</option>
              </select>
            </div>

            <div>
              <label htmlFor="currentSpend" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Monthly spend on content/marketing/tools? *
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
                <option value="0-500" style={{ backgroundColor: "#000" }}>€0 - €500</option>
                <option value="500-1500" style={{ backgroundColor: "#000" }}>€500 - €1,500</option>
                <option value="1500-3000" style={{ backgroundColor: "#000" }}>€1,500 - €3,000</option>
                <option value="3000+" style={{ backgroundColor: "#000" }}>€3,000+</option>
              </select>
            </div>

            <div>
              <label htmlFor="hoursPerWeek" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Hours per week on content right now? *
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
                Biggest bottleneck right now? *
              </label>
              <textarea
                id="biggestBottleneck"
                name="biggestBottleneck"
                value={formData.biggestBottleneck}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors resize-none"
                placeholder="Be real. One short paragraph is enough."
              />
            </div>

            <div>
              <label htmlFor="businessDescription" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                What do you do and who do you help? (2-3 lines) *
              </label>
              <textarea
                id="businessDescription"
                name="businessDescription"
                value={formData.businessDescription}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors resize-none"
                placeholder="Simple is good."
              />
            </div>

            <div>
              <label htmlFor="whyInterested" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Why now? *
              </label>
              <textarea
                id="whyInterested"
                name="whyInterested"
                value={formData.whyInterested}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-transparent border border-white/20 p-4 text-white focus:outline-none focus:border-white transition-colors resize-none"
                placeholder="What result do you want in the next 90 days?"
              />
            </div>

            <div>
              <label htmlFor="readyToInvest" className="block text-xs uppercase tracking-[0.15em] text-stone-400 mb-2">
                Ready to invest this cycle? (Cohort €2,000-€2,497 | VIP €3,500-€4,997) *
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
                <option value="yes" style={{ backgroundColor: "#000" }}>Yes, I&apos;m ready</option>
                <option value="maybe" style={{ backgroundColor: "#000" }}>Maybe, I need details</option>
                <option value="no" style={{ backgroundColor: "#000" }}>Not yet</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-white/10 pt-8">
            <div className="bg-stone-900/50 border border-white/10 p-6 mb-6">
              <p className="text-sm text-stone-300 mb-2">
                <strong>Not sure if you&apos;re ready?</strong>
              </p>
              <p className="text-xs text-stone-400 leading-relaxed">
                Apply anyway. The application itself will give you clarity.
                If it&apos;s not the right fit or timing, I&apos;ll tell you honestly.
                No weird sales pressure.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 uppercase text-xs tracking-[0.15em] hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Apply here"}
            </button>
            <p className="text-xs text-stone-500 mt-4 text-center">
              No pressure. Cohort starts March 16, 2026.
              <br />
              You&apos;ll hear from me within 24 hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
