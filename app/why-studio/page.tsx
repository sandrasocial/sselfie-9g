"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useScroll, useTransform, motion } from "framer-motion"
import { useRef } from "react"
import TestimonialGrid from "@/components/testimonials/testimonial-grid"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"

export default function WhyStudioPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const heroContainer = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroContainer,
    offset: ["start start", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"])

  const handleStartCheckout = async (tierId: string) => {
    try {
      setCheckoutLoading(tierId)
      const clientSecret = await startEmbeddedCheckout(tierId)
      window.location.href = `/checkout?client_secret=${clientSecret}`
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
  }

  return (
    <div className="min-h-screen bg-stone-50 overflow-x-hidden">
      {/* Hero Section */}
      <section ref={heroContainer} className="h-screen overflow-hidden bg-white">
        <motion.div style={{ y }} className="relative h-full">
          <Image
            src="/images/luxury-portrait.png"
            fill
            alt="Professional brand photography"
            style={{ objectFit: "cover", objectPosition: "center" }}
            priority
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute inset-0 flex items-end z-10 pb-12 sm:pb-16 md:pb-24 lg:pb-32 px-6 sm:px-8 md:px-12 lg:px-16">
            <div className="text-left text-white max-w-4xl">
              <p className="text-sm sm:text-base md:text-lg font-light tracking-[0.2em] uppercase text-white/80 mb-4 sm:mb-6">
                SSELFIE STUDIO
              </p>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-4 sm:mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Stop hiding. Start showing up beautifully.
              </h1>
              <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-2 sm:mb-3 max-w-xl font-light">
                SSELFIE Studio helps you create your own brand photos, plan your social feed, and stay visible, all in one simple system.
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-6 sm:mb-8 max-w-xl font-light text-white/90">
                No photographers. No stress. No more overthinking what to post.
              </p>
              <a
                href="#pricing"
                onClick={scrollToPricing}
                className="inline-flex px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white min-h-[48px] items-center justify-center font-light"
              >
                Join The Visibility Studio →
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Transformational Quote Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-stone-950">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-12 text-center">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-[1.3] text-stone-50 mb-6 sm:mb-8"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Visibility changes everything.
          </h2>
          <blockquote
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-[1.3] text-stone-50 mb-6 sm:mb-8"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            "I used to hide behind my logo. Now I'm the face of my brand, and it's changed everything."
          </blockquote>
          <p className="text-sm sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 max-w-2xl mx-auto px-4 font-light tracking-wider uppercase text-stone-400">
            — Sarah, Studio Member
          </p>
        </div>
      </section>

      {/* Why Studio Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              WHY STUDIO
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              You don't need another AI app. You need a visibility system.
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4 max-w-3xl mx-auto">
              Most people struggle to stay consistent online. SSELFIE Studio makes it easy to keep showing up with confidence.
            </p>
          </div>

          <div className="text-center mb-12 sm:mb-16">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Everything you need to stay visible
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 max-w-6xl mx-auto">
            {/* Benefit 1: Brand Photos */}
            <div className="space-y-6">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/618-tvcuzvg8v6r2bput7px8v06bchrxgx.png"
                  fill
                  alt="Brand photos that actually look like you"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Brand Photos</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Brand photos that actually look like you, no filters or weird edits.
                </h3>
              </div>
            </div>

            {/* Benefit 2: Feed Planner */}
            <div className="space-y-6">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png"
                  fill
                  alt="Feed Planner to design your Instagram grid"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Feed Planner</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Feed Planner to design your Instagram grid and keep it consistent.
                </h3>
              </div>
            </div>

            {/* Benefit 3: Learning Hub */}
            <div className="space-y-6">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/616-nnepryg0hs2y745w8znu8twvfrgude.png"
                  fill
                  alt="Learning Hub with bite-sized lessons"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Learning Hub</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Learning Hub with bite-sized lessons to grow your visibility.
                </h3>
              </div>
            </div>

            {/* Benefit 4: Monthly Content Ideas */}
            <div className="space-y-6">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png"
                  fill
                  alt="Monthly content ideas and style drops"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Monthly Ideas</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Monthly content ideas and style drops to keep things fresh.
                </h3>
              </div>
            </div>
          </div>

          <div className="text-center mt-16 sm:mt-20">
            <a
              href="#pricing"
              onClick={scrollToPricing}
              className="inline-flex px-8 sm:px-10 py-3.5 sm:py-4 bg-stone-950 text-stone-50 text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-stone-800 border border-stone-950 min-h-[48px] items-center justify-center font-light"
            >
              Join now →
            </a>
          </div>

          {/* Additional Benefits */}
          <div className="mt-16 sm:mt-20 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-stone-200">
              <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-8 text-center" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                Plus, You Get:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 mb-2">Full Maya AI Assistant Access</p>
                    <p className="text-base font-light text-stone-600">Get personalized photo ideas, captions, and strategy advice.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 mb-2">Direct Support from Sandra</p>
                    <p className="text-base font-light text-stone-600">Get help when you need it, directly from the founder.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 mb-2">Cancel Anytime</p>
                    <p className="text-base font-light text-stone-600">No long-term commitment. Cancel whenever you want.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 mb-2">30-Day Money-Back Guarantee</p>
                    <p className="text-base font-light text-stone-600">Try it risk-free. If it's not for you, get a full refund.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              THE DIFFERENCE
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-4 sm:mb-6 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Choose your visibility plan
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4 mb-8 sm:mb-10">
              Whether you want to try the Studio or go all in, we've made it simple.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 max-w-5xl mx-auto">
            {/* One-Time */}
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
              <h3 className="text-xl sm:text-2xl font-light text-stone-900 mb-6" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                Starter Plan — Try your first Studio session
              </h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">•</span>
                  <span className="text-base font-light text-stone-600">50 credits (one-time)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">•</span>
                  <span className="text-base font-light text-stone-600">Basic Maya AI assistant</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">•</span>
                  <span className="text-base font-light text-stone-600">Perfect for testing</span>
                </li>
              </ul>
              <p className="text-3xl sm:text-4xl font-light text-stone-900 mb-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                $49
              </p>
              <p className="text-sm font-light text-stone-600">one-time</p>
            </div>

            {/* Studio Membership */}
            <div className="bg-stone-950 text-stone-50 rounded-2xl p-8 border-2 border-stone-950 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-50 text-stone-950 px-4 py-1 rounded-sm">
                <p className="text-[10px] font-light tracking-[0.2em] uppercase whitespace-nowrap">
                  Best Value
                </p>
              </div>
              <h3 className="text-xl sm:text-2xl font-light text-stone-50 mb-6 mt-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                Full Membership — Join the Visibility System
              </h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">✓</span>
                  <span className="text-base font-light text-stone-100">200 credits every month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">✓</span>
                  <span className="text-base font-light text-stone-100">Full Maya AI assistant</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">✓</span>
                  <span className="text-base font-light text-stone-100">Complete Brand Academy</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">✓</span>
                  <span className="text-base font-light text-stone-100">Feed Designer</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">✓</span>
                  <span className="text-base font-light text-stone-100">Monthly strategy drops</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-stone-400">✓</span>
                  <span className="text-base font-light text-stone-100">Direct support from Sandra</span>
                </li>
              </ul>
              <p className="text-3xl sm:text-4xl font-light text-stone-50 mb-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                $97
              </p>
              <p className="text-sm font-light text-stone-300">per month</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              REAL RESULTS
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-4 sm:mb-6 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              What members are saying
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4 mb-8 sm:mb-10">
              Real stories from creators and coaches using SSELFIE to grow their brands.
            </p>
          </div>
          <TestimonialGrid />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              READY TO GET STARTED?
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-4 sm:mb-6 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              Join The Visibility Studio
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4 mb-8 sm:mb-10">
              One membership. All the tools you need to stay visible and confident.
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
                    $49
                  </span>
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
                {checkoutLoading === "one_time_session" ? "LOADING..." : "Start now →"}
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
                    $97
                  </span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-300 mt-2">per month • 200 credits/month</p>
              </div>
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <p className="text-base sm:text-lg font-light text-stone-100">
                  Monthly photo credits
                </p>
                <p className="text-base sm:text-lg font-light text-stone-100">Feed planning tools</p>
                <p className="text-base sm:text-lg font-light text-stone-100">Full Academy access</p>
                <p className="text-base sm:text-lg font-light text-stone-100">New content ideas every month</p>
              </div>
              <button
                onClick={() => handleStartCheckout("sselfie_studio_membership")}
                disabled={checkoutLoading === "sselfie_studio_membership"}
                className="w-full bg-stone-50 text-stone-950 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {checkoutLoading === "sselfie_studio_membership" ? "LOADING..." : "Join the Studio →"}
              </button>
            </div>
          </div>

          <div className="text-center mt-10 sm:mt-12 space-y-4">
            <p className="text-base sm:text-lg font-light text-stone-900 px-4">
              Cancel anytime. 30-day refund policy.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Story Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-stone-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed text-stone-900 mb-6 sm:mb-8"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            "I built this because showing up online used to feel impossible."
          </h2>
          <p className="text-lg sm:text-xl font-light leading-relaxed text-stone-700 mb-8 sm:mb-10">
            I was tired of hiding behind my logo and filters. I wanted something that made visibility simple, not scary. That's how SSELFIE Studio was born.
          </p>
          <p className="text-sm sm:text-base font-light text-stone-600">— Sandra</p>
        </div>
      </section>

      {/* Closing Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed text-stone-900 mb-8 sm:mb-10"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            You don't need perfect photos. You just need to show up.
          </h2>
          <a
            href="#pricing"
            onClick={scrollToPricing}
            className="inline-flex px-8 sm:px-10 py-3.5 sm:py-4 bg-stone-950 text-stone-50 text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-stone-800 border border-stone-950 min-h-[48px] items-center justify-center font-light"
          >
            Join The Studio Today →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-stone-500 text-sm mb-2 font-light">
            Questions? Just reply to any email - we read every message.
          </p>
          <p className="text-stone-600 font-medium">
            XoXo Sandra 💋
          </p>
        </div>
      </footer>
    </div>
  )
}












