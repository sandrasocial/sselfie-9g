"use client"

import { useState } from "react"
import Link from "next/link"

export default function AIBrandOSWaitlistPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || "Something went wrong. Try again.")
      }
    } catch (err) {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-stone-200 p-12 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-2xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-4">
            You're on the list.
          </h2>
          <p className="text-stone-600 mb-6">
            I'll email you when applications open (probably next week).
          </p>
          <p className="text-stone-600 text-sm mb-8">
            First 2 people get Founding Member pricing: $4,997 setup + $497/mo (instead of $7,500 + $697/mo).
          </p>
          <Link
            href="/"
            className="inline-block bg-stone-950 text-stone-50 px-8 py-3 text-sm tracking-[0.15em] uppercase hover:bg-stone-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link
            href="/"
            className="text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← SSELFIE
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Headline */}
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-['Times_New_Roman'] tracking-[-0.02em] text-stone-950 mb-6 leading-tight">
            I'll Build You an AI Marketing System That Runs 24/7
          </h1>
          <p className="text-xl text-stone-600 leading-relaxed">
            Not just content. Your complete AI operating system.
          </p>
        </div>

        {/* What You Get */}
        <div className="bg-white border border-stone-200 p-10 mb-12">
          <h2 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-6">
            What I Build For You
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="text-stone-950 font-bold mt-1">✓</div>
              <div>
                <strong className="text-stone-950">Your AI Content Twin</strong>
                <p className="text-sm text-stone-600">Custom AI trained on your face + voice. Generates content that sounds like you.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-stone-950 font-bold mt-1">✓</div>
              <div>
                <strong className="text-stone-950">6-8 Automation Workflows</strong>
                <p className="text-sm text-stone-600">Content generation, distribution, lead nurture, repurposing. Running 24/7.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-stone-950 font-bold mt-1">✓</div>
              <div>
                <strong className="text-stone-950">90 Days of Content Scheduled</strong>
                <p className="text-sm text-stone-600">150+ pieces ready to post across Instagram, LinkedIn, Twitter, email from day 1.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-stone-950 font-bold mt-1">✓</div>
              <div>
                <strong className="text-stone-950">Distribution System</strong>
                <p className="text-sm text-stone-600">Auto-posts to all platforms. Optimal timing. No manual work.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="text-stone-950 font-bold mt-1">✓</div>
              <div>
                <strong className="text-stone-950">Monthly Management</strong>
                <p className="text-sm text-stone-600">Strategy calls, optimization, new workflows, technical support. I handle everything.</p>
              </div>
            </div>
          </div>
        </div>

        {/* The Problem / Solution */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-4">
              The Problem
            </h3>
            <p className="text-stone-700 leading-relaxed">
              You're spending $3k-6k/mo on content teams, social media managers, and VAs.
            </p>
            <p className="text-stone-700 leading-relaxed mt-4">
              You're still writing content yourself. Manually posting to 3-4 platforms. Creating graphics and captions.
            </p>
            <p className="text-stone-700 leading-relaxed mt-4">
              <strong>Your marketing still requires YOU to run it.</strong>
            </p>
          </div>

          <div>
            <h3 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-4">
              The Solution
            </h3>
            <p className="text-stone-700 leading-relaxed">
              What if your marketing ran itself?
            </p>
            <p className="text-stone-700 leading-relaxed mt-4">
              Content generated automatically. Posted across all platforms. Leads nurtured on autopilot.
            </p>
            <p className="text-stone-700 leading-relaxed mt-4">
              <strong>That's what I build for you.</strong>
            </p>
          </div>
        </div>

        {/* Timeline & Pricing */}
        <div className="bg-stone-950 text-stone-50 p-10 mb-12">
          <h3 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-6">
            Timeline & Investment
          </h3>
          <div className="space-y-6">
            <div>
              <div className="text-xs text-stone-400 mb-1">6-Week Build</div>
              <div className="text-2xl font-['Times_New_Roman'] mb-2">Setup: $7,500</div>
              <div className="text-sm text-stone-300">
                Complete AI infrastructure built and live
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-400 mb-1">Ongoing</div>
              <div className="text-2xl font-['Times_New_Roman'] mb-2">Management: $697/mo</div>
              <div className="text-sm text-stone-300">
                All API costs + monthly strategy + optimization + support
              </div>
            </div>
            <div className="border-t border-stone-700 pt-6">
              <div className="text-xs text-stone-400 mb-1">First 2 Founding Members</div>
              <div className="text-3xl font-['Times_New_Roman'] mb-2">$4,997 + $497/mo</div>
              <div className="text-sm text-stone-300">
                Beta pricing locked for 12 months
              </div>
            </div>
          </div>
        </div>

        {/* What They're Replacing */}
        <div className="bg-white border border-stone-200 p-10 mb-12">
          <h3 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-6">
            What You're Replacing
          </h3>
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between text-stone-600">
              <span>Social media manager</span>
              <span className="text-stone-950">$1,500-3,000/mo</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Content writer</span>
              <span className="text-stone-950">$1,000-2,000/mo</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>VA for scheduling</span>
              <span className="text-stone-950">$500-1,000/mo</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Graphic designer</span>
              <span className="text-stone-950">$500-1,000/mo</span>
            </div>
            <div className="border-t border-stone-200 pt-3 flex justify-between">
              <span className="font-bold text-stone-950">Their Current Cost</span>
              <span className="font-bold text-stone-950">$3,500-7,000/mo</span>
            </div>
          </div>
          <div className="bg-stone-50 p-4 border border-stone-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-stone-950">Your Cost</span>
              <span className="text-2xl font-['Times_New_Roman'] text-stone-950">$697/mo</span>
            </div>
            <div className="text-xs text-stone-500 mt-2">
              Saves $2,803-6,303/mo compared to hiring team
            </div>
          </div>
        </div>

        {/* Who This Is For */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white border border-stone-200 p-8">
            <h3 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-4">
              This Is For You If
            </h3>
            <div className="space-y-2 text-sm text-stone-700">
              <div>✓ Making $100k-$500k/year</div>
              <div>✓ Spending $3k+/mo on content team (or doing it yourself 15+ hrs/week)</div>
              <div>✓ Content is your bottleneck to growth</div>
              <div>✓ You're comfortable with AI tools</div>
              <div>✓ You're ready to invest in infrastructure</div>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 p-8">
            <h3 className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-4">
              Not Right If
            </h3>
            <div className="space-y-2 text-sm text-stone-600">
              <div>✗ Under $100k/year revenue</div>
              <div>✗ Don't have proven offers yet</div>
              <div>✗ Want to stay fully hands-on with content</div>
              <div>✗ Can't invest $7k+ upfront</div>
            </div>
          </div>
        </div>

        {/* Capacity & Scarcity */}
        <div className="bg-amber-50 border-2 border-amber-300 p-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="text-lg font-['Times_New_Roman'] text-stone-950 mb-2">
                I take 3 clients per month max.
              </h3>
              <p className="text-stone-700 mb-4">
                This is white-glove service. I build and manage your entire AI infrastructure personally.
              </p>
              <p className="text-sm text-stone-600">
                First 2 spots are reserved for Founding Members at $4,997 setup (normally $7,500). After that, standard pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Waitlist Form */}
        <div className="bg-white border-2 border-stone-950 p-12">
          <h2 className="text-3xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-6">
            Join the Waitlist
          </h2>
          <p className="text-stone-600 mb-8">
            Applications open next week. First 2 people get Founding Member pricing.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-4 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-stone-300 p-4 text-stone-950 focus:outline-none focus:border-stone-950"
                placeholder="Sandra"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">
                Your Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-stone-300 p-4 text-stone-950 focus:outline-none focus:border-stone-950"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-950 text-stone-50 py-4 text-sm tracking-[0.15em] uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Waitlist"}
            </button>
          </form>

          <p className="text-xs text-stone-500 mt-6 text-center">
            I'll email you when applications open (probably next week). No spam.
          </p>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-sm text-stone-600 mb-2">
            Built by Sandra (The Selfie Queen)
          </p>
          <p className="text-xs text-stone-500">
            Single mom who rebuilt from scratch. 8 months building SSELFIE in isolation. Now helping women scale their businesses with AI.
          </p>
        </div>

      </div>
    </div>
  )
}
