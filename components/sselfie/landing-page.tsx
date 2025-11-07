"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useScroll, useTransform, motion } from "framer-motion"
import Image from "next/image"
import InteractivePipelineShowcase from "./interactive-pipeline-showcase"
import InteractiveFeaturesShowcase from "./interactive-features-showcase"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

interface LandingStats {
  waitlistCount: number
  usersCount: number
  spotsRemaining: number
  daysUntilClose: number
}

export default function LandingPage() {
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const [mayaMessages, setMayaMessages] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const [stats, setStats] = useState<LandingStats>({
    waitlistCount: 2847,
    usersCount: 0,
    spotsRemaining: 47,
    daysUntilClose: 14,
  })

  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistMessage, setWaitlistMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const heroContainer = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroContainer,
    offset: ["start start", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"])

  const aboutContainer = useRef(null)
  const { scrollYProgress: aboutScrollProgress } = useScroll({
    target: aboutContainer,
    offset: ["start end", "end start"],
  })
  const aboutY = useTransform(aboutScrollProgress, [0, 1], ["0vh", "30vh"])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/landing-stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("[v0] Error fetching landing stats:", error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyFooter(window.scrollY > 800)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const messages = [
      "Hi! I'm Maya, your AI photo strategist ✨",
      "I'll help you create stunning professional photos",
      "What kind of photos do you need today?",
    ]

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < messages.length) {
        setIsTyping(true)
        setTimeout(() => {
          setMayaMessages((prev) => [...prev, messages[currentIndex]])
          setIsTyping(false)
          currentIndex++
        }, 1000)
      } else {
        clearInterval(interval)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  const handleStartCheckout = async (tierId: string) => {
    try {
      setCheckoutLoading(tierId)
      const clientSecret = await createLandingCheckoutSession(tierId)
      if (clientSecret) {
        window.location.href = `/checkout?client_secret=${clientSecret}`
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Failed to start checkout. Please try again.")
      setCheckoutLoading(null)
    }
  }

  const scrollToPricing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const pricingSection = document.getElementById("pricing")
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    setIsMobileMenuOpen(false)
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistLoading(true)
    setWaitlistMessage(null)

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setWaitlistMessage({ type: "success", text: "You're on the list! We'll be in touch soon." })
        setWaitlistEmail("")
      } else {
        setWaitlistMessage({ type: "error", text: data.error || "Something went wrong. Please try again." })
      }
    } catch (error) {
      console.error("[v0] Waitlist submission error:", error)
      setWaitlistMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setWaitlistLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 overflow-x-hidden">
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="bg-stone-900/50 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <p className="text-center text-[10px] sm:text-xs font-light tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white/90">
              BETA CLOSES IN {stats.daysUntilClose} DAYS • {stats.spotsRemaining} SPOTS LEFT • 50% OFF
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            SSELFIE
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors"
            >
              FEATURES
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors"
            >
              PRICING
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors"
            >
              LOGIN
            </Link>
            <a
              href="#pricing"
              onClick={scrollToPricing}
              className="bg-white text-black px-6 py-2.5 text-xs uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
            >
              START BETA
            </a>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 w-11 h-11 justify-center items-center relative"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? (
              // X icon when menu is open
              <>
                <span className="absolute w-6 h-0.5 bg-white rotate-45" />
                <span className="absolute w-6 h-0.5 bg-white -rotate-45" />
              </>
            ) : (
              // Hamburger icon when menu is closed
              <>
                <span className="w-6 h-0.5 bg-white" />
                <span className="w-6 h-0.5 bg-white" />
                <span className="w-6 h-0.5 bg-white" />
              </>
            )}
          </button>
        </div>

        <div
          className={`md:hidden fixed inset-0 top-[76px] sm:top-[88px] bg-stone-950/95 backdrop-blur-lg transition-transform duration-300 z-40 ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full gap-6 sm:gap-8 px-6">
            <Link
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base sm:text-lg font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              FEATURES
            </Link>
            <Link
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base sm:text-lg font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              PRICING
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base sm:text-lg font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              LOGIN
            </Link>
            <a
              href="#pricing"
              onClick={scrollToPricing}
              className="bg-white text-black px-8 py-3 text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white min-h-[44px] flex items-center justify-center"
            >
              START BETA
            </a>
          </div>
        </div>
      </nav>

      <section ref={heroContainer} className="h-screen overflow-hidden bg-white">
        <motion.div style={{ y }} className="relative h-full">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/out-0%20%2847%29-PPDI5iYgrRw2D9z20NwUUKuPpAC2n0.png"
            fill
            alt="Professional brand photography"
            style={{ objectFit: "cover", objectPosition: "center 20%" }}
            priority
          />

          <div className="absolute inset-0 bg-black/50" />

          <div className="absolute inset-0 flex items-end justify-start z-10 pb-8 sm:pb-12 md:pb-16 lg:pb-24 px-4 sm:px-6 md:px-12 lg:px-16">
            <div className="text-left text-white max-w-4xl">
              <h1
                className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                YOUR BRAND PHOTO STUDIO
              </h1>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed mb-2 sm:mb-3 md:mb-4 max-w-2xl font-light">
                100 professional brand photos every month. No photographer, no photoshoot. Just upload selfies and get
                photos that actually look like you.
              </p>
              <p className="text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 md:mb-8 max-w-2xl font-light text-white/80">
                Replace $2,000+ photoshoots. Ready for your website, social media, and everywhere else.
              </p>
              <a
                href="#pricing"
                onClick={scrollToPricing}
                className="inline-block px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-3.5 bg-white text-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white min-h-[44px] flex items-center justify-center"
              >
                GET STARTED
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CHANGE: Add transformational quote section for emotional connection */}
      <section className="py-16 sm:py-20 md:py-24 bg-stone-950">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-12 text-center">
          <blockquote
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-[1.3] text-stone-50 mb-6 sm:mb-8"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            "I never imagined an AI photo could make me see myself this way."
          </blockquote>
          <p className="text-sm sm:text-base font-light tracking-wider uppercase text-stone-400">— SHANNON - MEMBER</p>
        </div>
      </section>

      <section ref={aboutContainer} className="relative py-24 sm:py-32 md:py-40 bg-stone-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-start">
            <motion.div style={{ y: aboutY }} className="relative hidden md:block">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden max-w-md mx-auto">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/100-W8HXvEhCIG14XjVDUygpuBKAhlwZCj-WJvAoPmd0GqXTjJE1mvy77jVzJGvyA.png"
                  fill
                  alt="Sandra - Founder of SSELFIE"
                  className="object-cover"
                />
              </div>
              <p className="text-xs md:text-sm font-light tracking-wider uppercase text-stone-500 mt-4 text-center">
                SANDRA, FOUNDER
              </p>
            </motion.div>

            <div className="space-y-4 sm:space-y-6 md:space-y-8">
              <div>
                <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
                  THE STORY
                </p>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light mb-6 sm:mb-8 md:mb-10 leading-[1.1] tracking-tight"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  Built from Nothing.
                  <br />
                  Built from Selfies.
                </h2>
              </div>

              <div className="relative md:hidden my-6 sm:my-8">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden max-w-[240px] sm:max-w-[280px] mx-auto">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/100-W8HXvEhCIG14XjVDUygpuBKAhlwZCj-WJvAoPmd0GqXTjJE1mvy77jVzJGvyA.png"
                    fill
                    alt="Sandra - Founder of SSELFIE"
                    className="object-cover"
                  />
                </div>
                <p className="text-[10px] sm:text-xs font-light tracking-wider uppercase text-stone-500 mt-3 sm:mt-4 text-center">
                  SANDRA, FOUNDER
                </p>
              </div>

              <blockquote
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed text-stone-900 border-l-2 border-stone-900 pl-6 sm:pl-8 my-8 sm:my-10"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                "I built my business from nothing but selfies and a story."
              </blockquote>

              <div className="space-y-4 sm:space-y-5 text-base sm:text-lg md:text-xl font-light leading-relaxed text-stone-700">
                <p>
                  Single mom of three. Divorced, broke, overwhelmed. I started by teaching women how to take better
                  selfies on Instagram, then shared my own story.
                </p>
                <p>
                  That's how SSELFIE was born helping women who feel invisible get the professional photos they need to
                  build their brands. No photoshoot needed.
                </p>
              </div>

              <div className="pt-4 sm:pt-6 border-t border-stone-200">
                <p className="text-xs sm:text-sm font-light text-stone-600">— Sandra</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InteractivePipelineShowcase />

      <section className="py-24 sm:py-32 md:py-40 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              WHO THIS IS FOR
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              This Is For You If...
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 max-w-6xl mx-auto">
            <div className="space-y-5">
              <p className="text-lg sm:text-xl font-light text-stone-900 leading-relaxed">
                You're building a personal brand but hate photoshoots
              </p>
              <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                You know you need professional photos, but the thought of hiring a photographer, planning outfits, and
                posing for hours makes you want to hide.
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-lg sm:text-xl font-light text-stone-900 leading-relaxed">
                You're a coach or consultant who needs fresh content
              </p>
              <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                Your clients expect to see you showing up consistently. You need new photos every month, not the same
                three headshots from 2022.
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-lg sm:text-xl font-light text-stone-900 leading-relaxed">
                You're tired of hiding behind stock photos
              </p>
              <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                Generic stock images don't represent you. You want photos that actually look like you and match your
                brand—without the hassle.
              </p>
            </div>
          </div>

          <div className="text-center mt-16 sm:mt-20 max-w-3xl mx-auto space-y-6 sm:space-y-8">
            <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-stone-900">
              Don't let another month go by hiding behind stock photos.
            </p>
            <p className="text-lg sm:text-xl font-light leading-relaxed text-stone-700">
              Your competitors are already showing up. Are you?
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              WHY THIS MATTERS
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Not Just Another AI Headshot Tool
            </h2>
            <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed text-stone-700 max-w-3xl mx-auto px-4 mb-12 sm:mb-16">
              Most AI photo apps give you a one-time set of random portraits. That's it. But your brand needs more than
              that. You need fresh content every month, photos that match your vibe, and a consistent look across
              everything you post.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 max-w-5xl mx-auto">
            {/* Generic AI Headshot */}
            <div className="space-y-4 sm:space-y-6">
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/nano-banana-2025-09-07T16-04-25%202.PNG-0s4I1jvBnbIX8h3rcErnaGVYlubSnM.png"
                  fill
                  alt="Generic AI headshot example"
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5">
                  <p className="text-[10px] sm:text-xs font-light tracking-[0.2em] uppercase text-stone-900">
                    Generic AI Headshots
                  </p>
                </div>
              </div>
              <div className="space-y-3 px-2">
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">
                  One-time batch of photos, then you're done
                </p>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">
                  Random styles that don't match your brand
                </p>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">
                  No guidance on what to do with them
                </p>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">
                  You're on your own after purchase
                </p>
              </div>
            </div>

            {/* SSELFIE Studio */}
            <div className="space-y-4 sm:space-y-6">
              <div className="relative aspect-[3/4] overflow-hidden border-2 border-stone-950">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8033.PNG-traeG5sQknTbuYctI1xadVW2QWPXds.png"
                  fill
                  alt="SSELFIE Studio example"
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-stone-950/90 backdrop-blur-sm px-3 py-1.5">
                  <p className="text-[10px] sm:text-xs font-light tracking-[0.2em] uppercase text-stone-50">
                    SSELFIE Studio
                  </p>
                </div>
              </div>
              <div className="space-y-3 px-2">
                <p className="text-xs sm:text-sm font-light text-stone-900 leading-relaxed">
                  <strong className="font-medium">100 new photos every single month</strong>
                </p>
                <p className="text-xs sm:text-sm font-light text-stone-900 leading-relaxed">
                  Consistent brand look across all your content
                </p>
                <p className="text-xs sm:text-sm font-light text-stone-900 leading-relaxed">
                  Learn how to use them with our Academy
                </p>
                <p className="text-xs sm:text-sm font-light text-stone-900 leading-relaxed">
                  Ongoing support and fresh content drops
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed text-stone-900 max-w-2xl mx-auto px-4">
              This isn't about getting a fun set of AI portraits. It's about showing up consistently, building your
              brand, and having the confidence to be visible—month after month.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 sm:py-32 md:py-40 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              WHAT YOU GET
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Everything You Need
            </h2>
            <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed text-stone-700 mt-6 sm:mt-8 max-w-2xl mx-auto px-4">
              Stop hiding behind stock photos. Get everything you need to show up confident and build a brand that feels
              like you.
            </p>
          </div>

          <InteractiveFeaturesShowcase />
        </div>
      </section>

      <section id="pricing" className="py-24 sm:py-32 md:py-40 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              BETA PRICING
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-4 sm:mb-6 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {stats.spotsRemaining} Spots Left
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4 mb-3">
              Lock in beta pricing forever. Limited spots available.
            </p>
            <p className="text-base font-light text-stone-600 px-4">
              Join {stats.waitlistCount.toLocaleString()} people on the waitlist
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200">
              <p className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-2">
                ONE-TIME SESSION
              </p>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl sm:text-6xl font-light"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $24.50
                  </span>
                  <span className="text-base sm:text-lg text-stone-500 line-through">$49</span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-600 mt-2">one-time • 50 credits</p>
              </div>
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <p className="text-base sm:text-lg font-light text-stone-700">
                  Trained model that looks exactly like you
                </p>
                <p className="text-base sm:text-lg font-light text-stone-700">Basic Maya AI assistant</p>
                <p className="text-base sm:text-lg font-light text-stone-700">Perfect for testing</p>
              </div>
              <button
                onClick={() => handleStartCheckout("one_time_session")}
                disabled={checkoutLoading === "one_time_session"}
                className="w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {checkoutLoading === "one_time_session" ? "LOADING..." : "TRY ONCE"}
              </button>
            </div>

            <div className="bg-stone-950 text-stone-50 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-stone-50 text-stone-950 px-3 py-1 rounded-sm">
                <p className="text-[9px] sm:text-[10px] font-light tracking-[0.2em] uppercase whitespace-nowrap">
                  Best for building a brand
                </p>
              </div>
              <p className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-400 mb-2 mt-2">
                STUDIO MEMBERSHIP
              </p>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl sm:text-6xl font-light"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $49.50
                  </span>
                  <span className="text-base sm:text-lg text-stone-400 line-through">$99</span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-300 mt-2">per month • 100 credits/month</p>
              </div>
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <p className="text-base sm:text-lg font-light text-stone-100">
                  Trained model that looks exactly like you
                </p>
                <p className="text-base sm:text-lg font-light text-stone-100">Full Maya AI assistant access</p>
                <p className="text-base sm:text-lg font-light text-stone-100">Complete Brand Academy</p>
                <p className="text-base sm:text-lg font-light text-stone-100">Instagram feed designer</p>
                <p className="text-base sm:text-lg font-light text-stone-100">Monthly content strategy</p>
              </div>
              <button
                onClick={() => handleStartCheckout("sselfie_studio_membership")}
                disabled={checkoutLoading === "sselfie_studio_membership"}
                className="w-full bg-stone-50 text-stone-950 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {checkoutLoading === "sselfie_studio_membership" ? "LOADING..." : "JOIN STUDIO"}
              </button>
            </div>
          </div>

          <div className="text-center mt-10 sm:mt-12 space-y-4">
            <p className="text-base sm:text-lg font-light text-stone-900">
              <strong className="font-medium">30-Day Money-Back Guarantee</strong>
            </p>
            <p className="text-sm sm:text-base font-light text-stone-600 px-4">
              Beta pricing locked in forever • Cancel anytime • Add credits anytime
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-stone-100 border-t border-stone-200 py-12 sm:py-16 pb-36 sm:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <Link
                href="/"
                className="text-xl sm:text-2xl font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase mb-4 sm:mb-6 block"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                SSELFIE
              </Link>
              <p className="text-sm sm:text-base font-light text-stone-600 leading-relaxed">
                Professional brand photos every month. No photographer needed. Built by Sandra, a single mom who turned
                selfies into a business.
              </p>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
                QUICK LINKS
              </h3>
              <div className="flex flex-col gap-3 sm:gap-4">
                <Link
                  href="/privacy"
                  className="text-sm sm:text-base font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  PRIVACY
                </Link>
                <Link
                  href="/terms"
                  className="text-sm sm:text-base font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  TERMS
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="text-sm sm:text-base font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  SIGN UP
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
                CONNECT
              </h3>
              <div className="flex flex-col gap-3 sm:gap-4">
                <a
                  href="mailto:hello@sselfie.ai"
                  className="text-sm sm:text-base font-light text-stone-600 hover:text-stone-950 transition-colors"
                >
                  hello@sselfie.ai
                </a>
                <a
                  href="https://instagram.com/sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base font-light text-stone-600 hover:text-stone-950 transition-colors flex items-center gap-2"
                >
                  <span>Instagram</span>
                  <span className="text-xs sm:text-sm">@sandra.social</span>
                </a>
                <a
                  href="https://tiktok.com/@sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base font-light text-stone-600 hover:text-stone-950 transition-colors flex items-center gap-2"
                >
                  <span>TikTok</span>
                  <span className="text-xs sm:text-sm">@sandra.social</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-8 sm:pt-10">
            <p className="text-center text-xs sm:text-sm font-light text-stone-500">
              © 2025 SSELFIE. All rights reserved. Made with love by Sandra.
            </p>
          </div>
        </div>
      </footer>

      {showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950 text-stone-50 py-4 sm:py-5 shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="text-center sm:text-left">
              <p
                className="text-lg sm:text-xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Join The Beta
              </p>
              <p className="text-xs sm:text-sm font-light text-stone-400">
                {stats.spotsRemaining} spots left • Beta closes in {stats.daysUntilClose} days
              </p>
            </div>
            <a
              href="#pricing"
              onClick={scrollToPricing}
              className="bg-stone-50 text-stone-950 px-8 sm:px-10 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px] flex items-center"
            >
              SEE PRICING
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
