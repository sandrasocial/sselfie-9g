"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [email, setEmail] = useState("")
  const [betaCount, setBetaCount] = useState(23) // Mock beta user count
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // TODO: Implement waitlist API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setEmail("")
    alert("You're on the waitlist! Check your email.")
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-['Times_New_Roman'] text-2xl font-light tracking-[0.3em] uppercase">
            SSELFIE
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-sm font-light text-stone-600 hover:text-stone-900 transition-colors"
            >
              LOGIN
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-stone-950 text-stone-50 hover:bg-stone-800 text-sm uppercase tracking-wider">
                START BETA
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-stone-100 to-stone-50"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-stone-900 text-stone-50 text-xs uppercase tracking-[0.3em] rounded-full">
            BETA LAUNCH — 50% OFF FOR FIRST 100 USERS
          </div>
          <h1 className="font-['Times_New_Roman'] text-6xl md:text-8xl font-extralight tracking-[0.4em] uppercase mb-8 text-stone-900">
            YOUR PERSONAL
            <br />
            PHOTO STUDIO
          </h1>
          <p className="text-lg md:text-xl font-light text-stone-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Professional brand photography powered by AI. Create stunning photos for your business in minutes, not
            hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="bg-stone-950 text-stone-50 hover:bg-stone-800 px-8 py-6 text-base uppercase tracking-wider"
              >
                CLAIM YOUR 50% OFF
              </Button>
            </Link>
            <p className="text-sm text-stone-500">{betaCount}/100 beta spots claimed</p>
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stone-50 to-transparent"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
      </section>

      {/* Interactive Feature: Maya AI Chat Demo */}
      <section className="py-32 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-900">
                MEET MAYA
              </h2>
              <p className="text-lg font-light text-stone-600 mb-8 leading-relaxed">
                Your personal AI photography assistant. Maya learns your brand, understands your style, and creates
                photo concepts tailored to your vision.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Learns your brand voice and aesthetic",
                  "Generates custom photo concepts",
                  "Guides you through every shoot",
                  "Remembers your preferences",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2.5" />
                    <span className="text-stone-700 font-light">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-stone-200">
              {/* Mock Maya Chat Interface */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center text-stone-50 text-xs font-light">
                    M
                  </div>
                  <div className="flex-1 bg-stone-100 rounded-2xl rounded-tl-none p-4">
                    <p className="text-sm text-stone-800 font-light">
                      Hi! I'm Maya ✨ I've learned your brand style. Ready to create some stunning photos for your
                      coaching business?
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-stone-900 text-stone-50 rounded-2xl rounded-tr-none p-4 max-w-xs ml-auto">
                    <p className="text-sm font-light">Yes! I need professional headshots for my website.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center text-stone-50 text-xs font-light">
                    M
                  </div>
                  <div className="flex-1 bg-stone-100 rounded-2xl rounded-tl-none p-4">
                    <p className="text-sm text-stone-800 font-light mb-3">
                      Perfect! Based on your warm, professional brand voice, here are 3 concepts:
                    </p>
                    <div className="space-y-2 text-xs text-stone-700">
                      <div className="p-2 bg-white rounded-lg">📸 Natural light office setting</div>
                      <div className="p-2 bg-white rounded-lg">📸 Outdoor confidence shot</div>
                      <div className="p-2 bg-white rounded-lg">📸 Studio professional portrait</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature: Photo Generation Demo */}
      <section className="py-32 px-6 bg-stone-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-900">
              TRANSFORM IN SECONDS
            </h2>
            <p className="text-lg font-light text-stone-600 max-w-2xl mx-auto">
              Watch your ideas become professional photos instantly
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "DESCRIBE", desc: "Tell Maya what you need" },
              { step: "02", title: "GENERATE", desc: "AI creates your photos" },
              { step: "03", title: "DOWNLOAD", desc: "Use them everywhere" },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-stone-200 hover:shadow-xl transition-shadow"
              >
                <div className="text-6xl font-['Times_New_Roman'] font-extralight text-stone-300 mb-4">{item.step}</div>
                <h3 className="font-['Times_New_Roman'] text-2xl font-light tracking-[0.2em] uppercase mb-3 text-stone-900">
                  {item.title}
                </h3>
                <p className="text-stone-600 font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta Pricing Section */}
      <section className="py-32 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 px-4 py-2 bg-red-500 text-white text-xs uppercase tracking-[0.3em] rounded-full">
              LIMITED TIME — BETA PRICING
            </div>
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-900">
              50% OFF FOR FIRST 100
            </h2>
            <p className="text-lg font-light text-stone-600 max-w-2xl mx-auto">
              Lock in beta pricing forever. Only {100 - betaCount} spots remaining.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "STARTER",
                price: "$24.50",
                original: "$49",
                credits: "100 credits/month",
                features: ["Maya AI Assistant", "Photo Generation", "Basic Academy Access", "Email Support"],
              },
              {
                name: "PRO",
                price: "$49.50",
                original: "$99",
                credits: "250 credits/month",
                features: [
                  "Everything in Starter",
                  "Priority Generation",
                  "Full Academy Access",
                  "Feed Designer",
                  "Priority Support",
                ],
                popular: true,
              },
              {
                name: "ELITE",
                price: "$99.50",
                original: "$199",
                credits: "600 credits/month",
                features: [
                  "Everything in Pro",
                  "Unlimited Academy",
                  "Advanced Feed Tools",
                  "1-on-1 Strategy Call",
                  "VIP Support",
                ],
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-8 border-2 ${plan.popular ? "border-stone-900 shadow-2xl scale-105" : "border-stone-200"} relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-stone-900 text-stone-50 px-4 py-1 text-xs uppercase tracking-wider rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="font-['Times_New_Roman'] text-2xl font-light tracking-[0.2em] uppercase mb-2 text-stone-900">
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-['Times_New_Roman'] font-light text-stone-900">{plan.price}</span>
                    <span className="text-lg text-stone-400 line-through">{plan.original}</span>
                  </div>
                  <p className="text-sm text-stone-500 mt-2">{plan.credits}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2" />
                      <span className="text-sm text-stone-700 font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/sign-up">
                  <Button
                    className={`w-full ${plan.popular ? "bg-stone-950 text-stone-50 hover:bg-stone-800" : "bg-stone-100 text-stone-900 hover:bg-stone-200"} uppercase tracking-wider`}
                  >
                    CLAIM THIS PLAN
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="py-32 px-6 bg-stone-900 text-stone-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6">
            NOT READY YET?
          </h2>
          <p className="text-lg font-light text-stone-300 mb-12">
            Join the waitlist and we'll notify you when we launch new features and special offers.
          </p>
          <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <Input
              type="email"
              placeholder="YOUR EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-stone-800 border-stone-700 text-stone-50 placeholder:text-stone-500 uppercase text-sm tracking-wider"
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-stone-50 text-stone-900 hover:bg-stone-200 uppercase tracking-wider"
            >
              {isSubmitting ? "JOINING..." : "JOIN WAITLIST"}
            </Button>
          </form>
        </div>
      </section>

      {/* Sticky Footer CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950 text-stone-50 py-4 px-6 border-t border-stone-800 transform transition-transform duration-300"
        style={{ transform: scrollY > 500 ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider font-light">BETA LAUNCH — 50% OFF</p>
            <p className="text-xs text-stone-400">{100 - betaCount} spots remaining</p>
          </div>
          <Link href="/auth/sign-up">
            <Button className="bg-stone-50 text-stone-900 hover:bg-stone-200 uppercase tracking-wider">
              START NOW
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
