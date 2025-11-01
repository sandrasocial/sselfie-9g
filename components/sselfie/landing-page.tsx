"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useScroll, useTransform, motion } from "framer-motion"
import Image from "next/image"
import InteractivePipelineShowcase from "./interactive-pipeline-showcase"
import InteractiveFeaturesShowcase from "./interactive-features-showcase"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export default function LandingPage() {
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const [mayaMessages, setMayaMessages] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

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
      const checkoutUrl = await createLandingCheckoutSession(tierId)
      if (checkoutUrl) {
        window.location.href = checkoutUrl
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
    <div className="min-h-screen bg-stone-50">
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-stone-900/50 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-2">
            <p className="text-center text-xs font-light tracking-[0.25em] uppercase text-white/90">
              BETA • 50% OFF • FIRST 100 USERS
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-light tracking-[0.3em] uppercase text-white"
            style={{ fontFamily: "Georgia, serif" }}
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
            className="md:hidden flex flex-col gap-1.5 w-8 h-8 justify-center items-center"
            aria-label="Toggle menu"
          >
            <span
              className={`w-6 h-0.5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span className={`w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`} />
            <span
              className={`w-6 h-0.5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>

        <div
          className={`md:hidden fixed inset-0 top-[88px] bg-stone-950/95 backdrop-blur-lg transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
            <Link
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors"
            >
              FEATURES
            </Link>
            <Link
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors"
            >
              PRICING
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-light tracking-wider uppercase text-white/90 hover:text-white transition-colors"
            >
              LOGIN
            </Link>
            <a
              href="#pricing"
              onClick={scrollToPricing}
              className="bg-white text-black px-8 py-3 text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
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

          <div className="absolute inset-0 flex items-end justify-start z-10 pb-12 md:pb-16 lg:pb-24 px-6 md:px-12 lg:px-16">
            <div className="text-left text-white max-w-4xl">
              <h1
                className="text-4xl md:text-6xl lg:text-7xl font-light mb-4 md:mb-6 leading-tight tracking-tight"
                style={{ fontFamily: "Georgia, serif" }}
              >
                YOUR PERSONAL AI
                <br />
                PHOTOGRAPHER
              </h1>
              <p className="text-sm md:text-base lg:text-lg leading-relaxed mb-6 md:mb-8 max-w-2xl font-light">
                Professional brand photos every month. No photographer needed. Just AI selfies that look like you,
                styled for your brand, and ready to use everywhere.
              </p>
              <a
                href="#pricing"
                onClick={scrollToPricing}
                className="inline-block px-8 md:px-10 py-3 md:py-3.5 bg-white text-black text-xs md:text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
              >
                GET STARTED
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      <section ref={aboutContainer} className="relative py-24 md:py-32 bg-stone-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
            {/* Image Column - Desktop Only */}
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

            {/* Text Column with Embedded Image on Mobile */}
            <div className="space-y-6 md:space-y-8">
              <div>
                <p className="text-xs md:text-sm font-light tracking-[0.3em] uppercase text-stone-500 mb-4">
                  THE STORY
                </p>
                <h2
                  className="text-3xl md:text-5xl lg:text-6xl font-extralight mb-6 md:mb-8 leading-[1.1] tracking-tight"
                  style={{ fontFamily: "'Times New Roman', serif" }}
                >
                  Built from Nothing.
                  <br />
                  Built from Selfies.
                </h2>
              </div>

              <div className="relative md:hidden my-8">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden max-w-[280px] mx-auto">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/100-W8HXvEhCIG14XjVDUygpuBKAhlwZCj-WJvAoPmd0GqXTjJE1mvy77jVzJGvyA.png"
                    fill
                    alt="Sandra - Founder of SSELFIE"
                    className="object-cover"
                  />
                </div>
                <p className="text-xs font-light tracking-wider uppercase text-stone-500 mt-4 text-center">
                  SANDRA, FOUNDER
                </p>
              </div>

              {/* Pull Quote - Vogue Style */}
              <blockquote
                className="text-xl md:text-2xl lg:text-3xl font-light leading-relaxed text-stone-900 border-l-2 border-stone-900 pl-6 my-8"
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                "I built my business from nothing but selfies and a story."
              </blockquote>

              {/* Body Text - Larger, More Readable */}
              <div className="space-y-4 text-base md:text-lg font-light leading-relaxed text-stone-700">
                <p>
                  Single mom of three. Divorced, broke, overwhelmed. I started by teaching women how to take better
                  selfies on Instagram, then shared my own story.
                </p>
                <p>
                  That's how SSELFIE was born—helping women who feel invisible get the professional photos they need to
                  build their brands. No photoshoot needed.
                </p>
              </div>

              {/* Signature Element - Editorial Touch */}
              <div className="pt-6 border-t border-stone-200">
                <p className="text-sm font-light tracking-wider text-stone-600">— Sandra</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InteractivePipelineShowcase />

      <section id="features" className="py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">BUILD YOUR BRAND EMPIRE</p>
            <h2
              className="text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              EVERYTHING YOU NEED
            </h2>
            <p className="text-base md:text-lg font-light leading-relaxed text-stone-700 mt-6 max-w-2xl mx-auto">
              From invisible to unmissable. The complete toolkit to build your personal brand, just like Sandra did.
            </p>
          </div>

          <InteractiveFeaturesShowcase />
        </div>
      </section>

      <section id="pricing" className="py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">BETA PRICING</p>
            <h2
              className="text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-4"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              50% OFF FOR FIRST 100
            </h2>
            <p className="text-lg font-light text-stone-700">Lock in beta pricing forever. Limited spots available.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
              <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-2">STARTER</p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight" style={{ fontFamily: "'Times New Roman', serif" }}>
                    $24.50
                  </span>
                  <span className="text-stone-500 line-through">$49</span>
                </div>
                <p className="text-sm font-light text-stone-600 mt-1">per month • 100 credits</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="text-sm font-light text-stone-700">100 AI photo credits/month</li>
                <li className="text-sm font-light text-stone-700">Maya AI assistant</li>
                <li className="text-sm font-light text-stone-700">Brand profile builder</li>
                <li className="text-sm font-light text-stone-700">Basic academy access</li>
              </ul>
              <button
                onClick={() => handleStartCheckout("starter")}
                disabled={checkoutLoading === "starter"}
                className="w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading === "starter" ? "LOADING..." : "START BETA"}
              </button>
            </div>

            <div className="bg-stone-950 text-stone-50 rounded-2xl p-8 border-2 border-stone-950 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-50 text-stone-950 px-4 py-1 rounded-full">
                <p className="text-xs font-light tracking-[0.3em] uppercase">MOST POPULAR</p>
              </div>
              <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-400 mb-2">PRO</p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight" style={{ fontFamily: "'Times New Roman', serif" }}>
                    $49.50
                  </span>
                  <span className="text-stone-400 line-through">$99</span>
                </div>
                <p className="text-sm font-light text-stone-300 mt-1">per month • 250 credits</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="text-sm font-light text-stone-100">250 AI photo credits/month</li>
                <li className="text-sm font-light text-stone-100">Priority Maya support</li>
                <li className="text-sm font-light text-stone-100">Advanced brand tools</li>
                <li className="text-sm font-light text-stone-100">Full academy access</li>
                <li className="text-sm font-light text-stone-100">Feed designer</li>
              </ul>
              <button
                onClick={() => handleStartCheckout("pro")}
                disabled={checkoutLoading === "pro"}
                className="w-full bg-stone-50 text-stone-950 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading === "pro" ? "LOADING..." : "START BETA"}
              </button>
            </div>

            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
              <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-2">ELITE</p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extralight" style={{ fontFamily: "'Times New Roman', serif" }}>
                    $99.50
                  </span>
                  <span className="text-stone-500 line-through">$199</span>
                </div>
                <p className="text-sm font-light text-stone-600 mt-1">per month • 600 credits</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="text-sm font-light text-stone-700">600 AI photo credits/month</li>
                <li className="text-sm font-light text-stone-700">VIP Maya access</li>
                <li className="text-sm font-light text-stone-700">Custom brand training</li>
                <li className="text-sm font-light text-stone-700">Exclusive masterclasses</li>
                <li className="text-sm font-light text-stone-700">Priority support</li>
              </ul>
              <button
                onClick={() => handleStartCheckout("elite")}
                disabled={checkoutLoading === "elite"}
                className="w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading === "elite" ? "LOADING..." : "START BETA"}
              </button>
            </div>
          </div>

          <p className="text-center mt-8 text-sm font-light text-stone-600">
            Beta pricing locked in forever • Cancel anytime
          </p>
        </div>
      </section>

      <section className="py-32 bg-stone-50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">NOT READY YET?</p>
          <h2
            className="text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            JOIN THE WAITLIST
          </h2>
          <p className="text-base font-light leading-relaxed text-stone-700 mb-8">
            Get early access updates, photo strategy tips, and exclusive beta invites.
          </p>

          {waitlistMessage && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                waitlistMessage.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <p className="text-sm font-light">{waitlistMessage.text}</p>
            </div>
          )}

          <form onSubmit={handleWaitlistSubmit} className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="YOUR EMAIL"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              required
              disabled={waitlistLoading}
              className="flex-1 px-6 py-3 bg-stone-100 border border-stone-200 rounded-lg text-sm font-light placeholder:text-stone-400 focus:outline-none focus:border-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={waitlistLoading}
              className="bg-stone-950 text-stone-50 px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {waitlistLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-50 border-t-transparent rounded-full animate-spin"></span>
                  <span>JOINING...</span>
                </>
              ) : (
                "JOIN"
              )}
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-stone-100 border-t border-stone-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Column */}
            <div>
              <Link
                href="/"
                className="text-xl font-extralight tracking-[0.3em] uppercase mb-4 block"
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                SSELFIE
              </Link>
              <p className="text-sm font-light text-stone-600 leading-relaxed">
                Professional brand photos every month. No photographer needed. Built by Sandra, a single mom who turned
                selfies into a business.
              </p>
            </div>

            {/* Links Column */}
            <div>
              <h3 className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">QUICK LINKS</h3>
              <div className="flex flex-col gap-3">
                <Link
                  href="/privacy"
                  className="text-sm font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  PRIVACY
                </Link>
                <Link
                  href="/terms"
                  className="text-sm font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  TERMS
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="text-sm font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
                >
                  SIGN UP
                </Link>
              </div>
            </div>

            {/* Contact & Social Column */}
            <div>
              <h3 className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">CONNECT</h3>
              <div className="flex flex-col gap-3">
                <a
                  href="mailto:hello@sselfie.ai"
                  className="text-sm font-light text-stone-600 hover:text-stone-950 transition-colors"
                >
                  hello@sselfie.ai
                </a>
                <a
                  href="https://instagram.com/sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-light text-stone-600 hover:text-stone-950 transition-colors flex items-center gap-2"
                >
                  <span>Instagram</span>
                  <span className="text-xs">@sandra.social</span>
                </a>
                <a
                  href="https://tiktok.com/@sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-light text-stone-600 hover:text-stone-950 transition-colors flex items-center gap-2"
                >
                  <span>TikTok</span>
                  <span className="text-xs">@sandra.social</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-8">
            <p className="text-center text-xs font-light text-stone-500">
              © 2025 SSELFIE. All rights reserved. Made with love by Sandra.
            </p>
          </div>
        </div>
      </footer>

      {showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950 text-stone-50 py-4 shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div>
              <p
                className="text-lg font-extralight tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                JOIN THE BETA
              </p>
              <p className="text-xs font-light text-stone-400">50% off • Limited to first 100 users</p>
            </div>
            <a
              href="#pricing"
              onClick={scrollToPricing}
              className="bg-stone-50 text-stone-950 px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
            >
              SEE PRICING
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
