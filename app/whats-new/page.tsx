"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useScroll, useTransform, motion } from "framer-motion"
import { useRef } from "react"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import TestimonialGrid from "@/components/testimonials/testimonial-grid"

export default function WhatsNewPage() {
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

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute inset-0 flex items-end z-10 pb-12 sm:pb-16 md:pb-24 lg:pb-32 px-6 sm:px-8 md:px-12 lg:px-16">
            <div className="text-left text-white max-w-4xl">
              <p className="text-sm sm:text-base md:text-lg font-light tracking-[0.2em] uppercase text-white/80 mb-4 sm:mb-6">
                SSELFIE STUDIO
              </p>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-4 sm:mb-6 leading-[1.1] tracking-tight"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                HERE'S WHAT'S NEW
              </h1>
              <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-2 sm:mb-3 max-w-xl font-light">
                SSELFIE Studio has grown into something we're really proud of.
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-6 sm:mb-8 max-w-xl font-light text-white/90">
                And we think you'd love what we've built.
              </p>
              <a
                href="#pricing"
                onClick={scrollToPricing}
                className="inline-block px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white min-h-[48px] flex items-center justify-center font-light"
              >
                SEE WHAT'S NEW
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Transformational Quote Section */}
      <section className="py-16 sm:py-20 md:py-24 bg-stone-950">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 md:px-12 text-center">
          <blockquote
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-[1.3] text-stone-50 mb-6 sm:mb-8"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            "I used to hide behind my logo. Now I'm the face of my brand, and it's changed everything."
          </blockquote>
          <p className="text-sm sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 max-w-2xl mx-auto px-4 font-light tracking-wider uppercase text-stone-400">
            — SARAH - STUDIO MEMBER
          </p>
        </div>
      </section>

      {/* What's New Features Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              WHAT'S NEW
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              We've Been Building
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4 max-w-3xl mx-auto">
              It's been a while since we connected, and we wanted to reach out because something's changed. SSELFIE Studio has grown into something we're really proud of - and we think you'd love what we've built.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 max-w-6xl mx-auto">
            {/* Feature 1: 150+ Photos */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/618-tvcuzvg8v6r2bput7px8v06bchrxgx.png"
                  fill
                  alt="150+ Professional Photos Every Month"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">150+ Photos Monthly</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  150+ Professional Photos Every Month
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                  Not just a few - you get a full library of professional photos every single month. Fresh content, always ready.
                </p>
              </div>
            </div>

            {/* Feature 2: Academy */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/616-nnepryg0hs2y745w8znu8twvfrgude.png"
                  fill
                  alt="Full Academy with Video Courses"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Complete Academy</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Full Academy with Video Courses & Templates
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                  Learn everything you need to build your personal brand with step-by-step video courses. Real strategies, not fluff.
                </p>
              </div>
            </div>

            {/* Feature 3: Feed Designer */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png"
                  fill
                  alt="Feed Designer to Plan Your Content"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Feed Designer</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Feed Designer to Plan Your Content
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                  Visualize and plan your Instagram feed before you post - see how everything looks together. Post with confidence.
                </p>
              </div>
            </div>

            {/* Feature 4: Monthly Drops */}
            <div className="space-y-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-200">
                <Image
                  src="/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png"
                  fill
                  alt="Monthly Drops with Newest Strategies"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-900">Monthly Strategy</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-light text-stone-900 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Monthly Drops with Newest Strategies
                </h3>
                <p className="text-base sm:text-lg font-light text-stone-600 leading-relaxed">
                  Stay ahead with the latest content strategies, trends, and tips delivered monthly. Always fresh, always relevant.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-16 sm:mt-20 max-w-3xl mx-auto space-y-6 sm:space-y-8">
            <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-stone-900">
              But honestly? The best part isn't the features.
            </p>
            <p className="text-lg sm:text-xl font-light leading-relaxed text-stone-700">
              It's watching women finally feel confident showing their face online. That's what gets us up every morning.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs sm:text-sm md:text-sm font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-4 sm:mb-6">
              REAL RESULTS
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-8 sm:mb-10 text-stone-900"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              What Our Members Say
            </h2>
          </div>
          <TestimonialGrid />
        </div>
      </section>

      {/* Pricing Section */}
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
              Choose Your Path
            </h2>
            <p className="text-lg sm:text-xl font-light text-stone-700 px-4">
              Ready to show up online in a way that feels authentic and powerful?
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
                <p className="text-sm sm:text-base font-light text-stone-600 mt-2">one-time • 70 credits</p>
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
                    $99
                  </span>
                </div>
                <p className="text-sm sm:text-base font-light text-stone-300 mt-2">per month • 150 credits/month</p>
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
            <p className="text-sm sm:text-base font-light text-stone-600 px-4">Cancel anytime • Add credits anytime</p>
          </div>
        </div>
      </section>

      {/* Soft Close Section */}
      <section className="py-24 sm:py-32 md:py-40 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xl sm:text-2xl md:text-3xl font-light leading-relaxed text-stone-900 mb-6 sm:mb-8">
            I'm not here to sell you anything.
          </p>
          <p className="text-lg sm:text-xl font-light leading-relaxed text-stone-700 mb-8 sm:mb-10">
            I just wanted you to know what's possible now. If you're ready to show up online in a way that feels authentic and powerful, we're here.
          </p>
          <p className="text-base sm:text-lg font-light text-stone-600 mb-8">
            No pressure. Just wanted to reconnect and see how you're doing.
          </p>
          <Link
            href="/"
            className="inline-block text-stone-600 hover:text-stone-900 underline font-light transition-colors"
          >
            Learn more about SSELFIE
          </Link>
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
