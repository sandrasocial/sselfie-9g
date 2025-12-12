"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useScroll, useTransform, motion } from "framer-motion"
import Image from "next/image"
import InteractivePipelineShowcase from "./interactive-pipeline-showcase"
import InteractiveFeaturesShowcase from "./interactive-features-showcase"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import TestimonialGrid from "@/components/testimonials/testimonial-grid"
import { trackCTAClick, trackPricingView, trackCheckoutStart, trackEmailSignup, trackSocialClick } from "@/lib/analytics"

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

  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistMessage, setWaitlistMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [stats, setStats] = useState<LandingStats>({
    waitlistCount: 2847,
    usersCount: 0,
    spotsRemaining: 47,
    daysUntilClose: 14,
  })

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

  // Track pricing section view
  useEffect(() => {
    const pricingSection = document.getElementById("pricing")
    if (!pricingSection) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackPricingView()
            observer.disconnect() // Only track once
          }
        })
      },
      { threshold: 0.3 } // Trigger when 30% of section is visible
    )

    observer.observe(pricingSection)
    return () => observer.disconnect()
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
      
      // Track checkout start
      const productNames: Record<string, string> = {
        one_time_session: "Instagram Photoshoot",
        sselfie_studio_membership: "Content Creator Studio",
        brand_studio_membership: "Brand Studio",
      }
      const productName = productNames[tierId] || tierId
      trackCheckoutStart(tierId, undefined)
      trackCTAClick("pricing", productName, "/checkout")
      
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

  const scrollToFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const featuresSection = document.getElementById("features")
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    setIsMobileMenuOpen(false)
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistLoading(true)
    setWaitlistMessage(null)

    // Track email signup
    trackEmailSignup("landing_page", "waitlist")

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
        {/* <div className="bg-stone-900/50 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <p className="text-center text-[10px] sm:text-xs font-light tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white/90">
              BETA CLOSES IN {stats.daysUntilClose} DAYS • {stats.spotsRemaining} SPOTS LEFT • 50% OFF
            </p>
          </div>
        </div> */}

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
              onClick={(e) => {
                trackCTAClick("nav", "GET STARTED", "#pricing")
                scrollToPricing(e)
              }}
              className="bg-white text-black px-6 py-2.5 text-xs uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
            >
              GET STARTED
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
              onClick={(e) => {
                trackCTAClick("mobile_nav", "GET STARTED", "#pricing")
                scrollToPricing(e)
              }}
              className="bg-white text-black px-8 py-3 text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white min-h-[44px] flex items-center justify-center"
            >
              GET STARTED
            </a>
          </div>
        </div>
      </nav>

      <section ref={heroContainer} className="h-screen overflow-hidden bg-white">
        <motion.div style={{ y }} className="relative h-full">
          <Image
            src="/images/luxury-portrait.png"
            fill
            alt="Professional brand photography"
            style={{ objectFit: "cover", objectPosition: "center" }}
            priority
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute inset-0 flex items-end z-10 pb-12 sm:pb-16 md:pb-24 lg:pb-32 px-6 sm:px-8 md:px-12 lg:px-16">
            <div className="text-left text-white max-w-4xl">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-4 sm:mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Built from Selfies. Built from Nothing.
              </h1>
              <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-6 sm:mb-8 max-w-xl font-light">
                Now I help you do the same.
              </p>
              <a
                href="#features"
                onClick={(e) => {
                  trackCTAClick("hero", "SEE HOW IT WORKS", "#features")
                  scrollToFeatures(e)
                }}
                className="inline-block px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white min-h-[48px] flex items-center justify-center font-light"
              >
                SEE HOW IT WORKS
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* What You Actually Get Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              What You Actually Get
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl font-light text-stone-600 max-w-2xl mx-auto">
              Not just photos. Your complete content system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 max-w-6xl mx-auto">
            {/* Card 1: Never Run Out of Content */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg">
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-stone-200 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-stone-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-light text-stone-900 mb-3 sm:mb-4">
                  Never Run Out of Content Again
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed mb-4">
                  Get unlimited photoshoots and video b-roll - so you always have fresh content ready to post. No more
                  stressing about what to post next.
                </p>
                <div className="inline-block bg-stone-200/50 text-stone-700 px-3 py-1.5 rounded-full text-sm font-light">
                  Saves 10+ hours per week
                </div>
              </div>
            </div>

            {/* Card 2: Look Professional Without the Price Tag */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg">
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-stone-200 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-stone-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-light text-stone-900 mb-3 sm:mb-4">
                  Look Professional Without the Price Tag
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed mb-4">
                  Professional-quality photos that actually look like you - without spending $500-2,000 on photoshoots.
                  AI that understands your brand.
                </p>
                <div className="inline-block bg-stone-200/50 text-stone-700 px-3 py-1.5 rounded-full text-sm font-light">
                  Replaces $3,000/month in services
                </div>
              </div>
            </div>

            {/* Card 3: Know Exactly What to Post */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg">
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-stone-200 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-stone-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-light text-stone-900 mb-3 sm:mb-4">
                  Know Exactly What to Post
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed mb-4">
                  Feed Designer plans your entire 9-post Instagram grid with captions and strategy. No more guessing
                  what content to create.
                </p>
                <div className="inline-block bg-stone-200/50 text-stone-700 px-3 py-1.5 rounded-full text-sm font-light">
                  Proven Instagram strategy
                </div>
              </div>
            </div>

            {/* Card 4: Learn While You Create */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg">
              <div className="mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-stone-200 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-stone-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-light text-stone-900 mb-3 sm:mb-4">
                  Learn While You Create
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed mb-4">
                  Full access to the Academy with courses on personal branding, content strategy, and growing your
                  influence.
                </p>
                <div className="inline-block bg-stone-200/50 text-stone-700 px-3 py-1.5 rounded-full text-sm font-light">
                  Worth $997 in courses
                </div>
              </div>
            </div>
          </div>
        </div>
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
          <p className="text-sm sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 max-w-2xl mx-auto px-4 font-light tracking-wider uppercase text-stone-400">
            — SHANNON - MEMBER
          </p>
        </div>
      </section>

      <section ref={aboutContainer} className="relative py-24 sm:py-32 md:py-40 bg-stone-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-start">
            <motion.div style={{ y: aboutY }} className="relative hidden md:block">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden max-w-md mx-auto">
                <Image
                  src="/images/100-w8hxvehcig14xjvduygpubkahlwzcj.png"
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
                    src="/images/100-w8hxvehcig14xjvduygpubkahlwzcj.png"
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
                headshots from 2022.
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
                  src="/images/nano-banana-2025-09-07t16-04-25-202.png"
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
                <Image src="/images/img-8033.png" fill alt="SSELFIE Studio example" className="object-cover" />
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

      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              CLIENT RESULTS
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Real Photos. Real Results.
            </h2>
            <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed text-stone-700 max-w-3xl mx-auto px-4">
              See how real members are using SSELFIE to build their brands and show up with confidence.
            </p>
          </div>
          <TestimonialGrid />
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
              PRICING
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-4 sm:mb-6 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Choose Your Plan
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4">
              Professional brand photos every month. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {/* Tier 1: Instagram Photoshoot */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200">
              <p className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3">
                INSTAGRAM PHOTOSHOOT
              </p>
              <h3
                className="text-2xl sm:text-3xl font-light mb-2 text-stone-900"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Professional Instagram Photos in 2 Hours
              </h3>
              <p className="text-sm sm:text-base font-light text-stone-600 mb-4">No Photographer Needed</p>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl sm:text-6xl font-light text-stone-900"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $49
                  </span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-600 mt-2">one-time</p>
              </div>
              <p className="text-base sm:text-lg font-light text-stone-700 mb-6 sm:mb-8 leading-relaxed">
                Get 50 magazine-quality images that actually look like you - for less than dinner out.
              </p>
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Your AI model trained on your photos</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>One complete photoshoot session</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>30-50 images in multiple styles</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Ready to post in 2 hours</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Download all in HD</span>
                </p>
              </div>
              <button
                onClick={() => handleStartCheckout("one_time_session")}
                disabled={checkoutLoading === "one_time_session"}
                className="w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {checkoutLoading === "one_time_session" ? "LOADING..." : "Get My Photoshoot Now"}
              </button>
            </div>

            {/* Tier 2: Content Creator Studio - MOST POPULAR */}
            <div className="bg-stone-950 text-stone-50 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 relative">
              <div className="absolute -top-3 right-4 bg-stone-950 text-stone-50 px-3 py-1.5 rounded-sm border border-stone-50/20">
                <p className="text-[9px] sm:text-[10px] font-light tracking-[0.2em] uppercase whitespace-nowrap">
                  MOST POPULAR
                </p>
              </div>
              <p className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-400 mb-3">
                CONTENT CREATOR STUDIO
              </p>
              <h3
                className="text-2xl sm:text-3xl font-light mb-2 text-stone-50"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Stop Scrambling for Content Every Week
              </h3>
              <p className="text-sm sm:text-base font-light text-stone-300 mb-4">
                Unlimited Photos + Videos + Feed Planning
              </p>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl sm:text-6xl font-light text-stone-50"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $79
                  </span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-300 mt-2">per month</p>
                <div className="mt-2">
                  <span className="inline-block bg-stone-800/50 text-stone-200 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-light tracking-wide">
                    Worth $1,500/month
                  </span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-light text-stone-100 mb-6 sm:mb-8 leading-relaxed">
                Get unlimited photoshoots, video b-roll, and feed planning - for less than one photoshoot.
              </p>
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <p className="text-sm sm:text-base font-light text-stone-100 flex items-start gap-2">
                  <span className="text-stone-50 mt-0.5">✓</span>
                  <span>Unlimited professional photoshoots (fair use: 3-4/month)</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-100 flex items-start gap-2">
                  <span className="text-stone-50 mt-0.5">✓</span>
                  <span>100+ images per month</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-100 flex items-start gap-2">
                  <span className="text-stone-50 mt-0.5">✓</span>
                  <span>20 video clips per month</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-100 flex items-start gap-2">
                  <span className="text-stone-50 mt-0.5">✓</span>
                  <span>9-post feed planner (saves 10 hours/month)</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-100 flex items-start gap-2">
                  <span className="text-stone-50 mt-0.5">✓</span>
                  <span>Priority generation queue</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-100 flex items-start gap-2">
                  <span className="text-stone-50 mt-0.5">✓</span>
                  <span>Cancel anytime</span>
                </p>
              </div>
              <button
                onClick={() => handleStartCheckout("sselfie_studio_membership")}
                disabled={checkoutLoading === "sselfie_studio_membership"}
                className="w-full bg-stone-50 text-stone-950 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {checkoutLoading === "sselfie_studio_membership" ? "LOADING..." : "Start My Studio Membership"}
              </button>
            </div>

            {/* Tier 3: Brand Studio */}
            <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200">
              <p className="text-xs sm:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3">
                BRAND STUDIO
              </p>
              <h3
                className="text-2xl sm:text-3xl font-light mb-2 text-stone-900"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Your Complete AI Content Team
              </h3>
              <p className="text-sm sm:text-base font-light text-stone-600 mb-4">
                Everything You Need to Run a Premium Brand
              </p>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl sm:text-6xl font-light text-stone-900"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $149
                  </span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-600 mt-2">per month</p>
                <div className="mt-2">
                  <span className="inline-block bg-stone-200/50 text-stone-700 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-light tracking-wide">
                    Worth $3,000+/month
                  </span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-light text-stone-700 mb-6 sm:mb-8 leading-relaxed">
                Photos, videos, strategy, templates, and an AI strategist who knows your brand inside out.
              </p>
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Everything in Creator Studio</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>200+ images per month</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>40+ video clips per month</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Maya AI strategist (unlimited consulting)</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Personal brand academy (2 full courses)</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>100+ Canva templates</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Monthly brand strategy drops</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Direct access to Sandra</span>
                </p>
                <p className="text-sm sm:text-base font-light text-stone-700 flex items-start gap-2">
                  <span className="text-stone-900 mt-0.5">✓</span>
                  <span>Priority support</span>
                </p>
              </div>
              <button
                onClick={() => handleStartCheckout("brand_studio_membership")}
                disabled={checkoutLoading === "brand_studio_membership"}
                className="w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {checkoutLoading === "brand_studio_membership" ? "LOADING..." : "Join Brand Studio"}
              </button>
            </div>
          </div>

          <div className="text-center mt-10 sm:mt-12 space-y-4">
            <p className="text-base sm:text-lg font-light text-stone-900">
              <strong className="font-medium">30-Day Money-Back Guarantee</strong>
            </p>
            <p className="text-sm sm:text-base font-light text-stone-600 px-4">Cancel anytime</p>
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
                  onClick={() => trackSocialClick("instagram", "https://instagram.com/sandra.social")}
                  className="text-sm sm:text-base font-light text-stone-600 hover:text-stone-950 transition-colors flex items-center gap-2"
                >
                  <span>Instagram</span>
                  <span className="text-xs sm:text-sm">@sandra.social</span>
                </a>
                <a
                  href="https://tiktok.com/@sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick("tiktok", "https://tiktok.com/@sandra.social")}
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
                Join SSELFIE
              </p>
              <p className="text-xs sm:text-sm font-light text-stone-400">Professional brand photos every month</p>
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
