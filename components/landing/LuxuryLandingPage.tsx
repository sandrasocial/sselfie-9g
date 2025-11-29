"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import TestimonialGrid from "@/components/testimonials/testimonial-grid"

export default function LuxuryLandingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/events/viewed-pricing", { method: "POST" }).catch((err) =>
      console.error("[v0] Failed to track pricing view:", err),
    )
  }, [])

  const handleStartCheckout = async (tierId: string) => {
    setCheckoutError(null)

    try {
      setCheckoutLoading(tierId)
      const clientSecret = await createLandingCheckoutSession(tierId)

      if (!clientSecret || typeof clientSecret !== "string") {
        throw new Error("Invalid checkout session created")
      }

      if (clientSecret) {
        window.location.href = `/checkout?client_secret=${clientSecret}`
      }
    } catch (error: any) {
      console.error("Checkout error:", error)
      const errorMessage = error.message || "Failed to start checkout. Please try again."
      setCheckoutError(errorMessage)
      alert(errorMessage)
    } finally {
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

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#F6F5F3]">
      {checkoutError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{checkoutError}</p>
              </div>
              <button onClick={() => setCheckoutError(null)} className="flex-shrink-0 text-red-600 hover:text-red-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className={`absolute top-0 left-0 right-0 z-50 ${isSticky ? "bg-stone-950/95" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <a
            href="/"
            className="text-xl sm:text-2xl font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            SSELFIE
          </a>

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
              GET STARTED
            </a>
          </div>

          <Link
            href="/auth/login"
            className="md:hidden text-base font-light tracking-[0.2em] uppercase text-white hover:text-white/80 transition-colors"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            LOGIN
          </Link>
        </div>
      </nav>

      <section className="relative h-[100vh] md:h-[90vh]">
        {/* Hero Image */}
        <Image
          src="/images/heroimage.png"
          alt="Woman entrepreneur in white blazer confidently building her personal brand"
          fill
          priority
          className="object-cover"
          style={{ objectPosition: "center 20%" }}
          sizes="100vw"
        />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 px-4 pb-12 md:gap-4 md:px-6 md:pb-24">
          <div className="mt-2" />

          <h1
            className="text-center text-[2.5rem] font-light leading-[1.1] text-white md:text-5xl md:leading-tight"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Show up online with confidence.
          </h1>

          <p className="max-w-[280px] text-center text-[15px] leading-relaxed text-white/90 md:max-w-[320px] md:text-base">
            Take better photos. Create simple content that feels like you.
          </p>

          <div className="mt-1 flex w-full max-w-md flex-col gap-2.5 md:gap-3">
            <button
              onClick={() => {
                fetch("/api/events/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event_name: "hero_enter_studio_clicked", event_value: "one_time_session" }),
                }).catch(() => {})
                handleStartCheckout("one_time_session")
              }}
              disabled={checkoutLoading === "one_time_session"}
              className="w-full bg-white py-3.5 text-[11px] font-medium uppercase tracking-widest text-black transition-all hover:bg-white/90 disabled:opacity-50 md:py-4 md:text-sm"
              style={{ letterSpacing: "0.2em" }}
              aria-label="Enter the SSELFIE Studio and start creating professional photos"
            >
              {checkoutLoading === "one_time_session" ? "Loading..." : "Enter the studio"}
            </button>
            <button
              onClick={() => {
                fetch("/api/events/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event_name: "hero_see_how_it_works_clicked" }),
                }).catch(() => {})
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }}
              className="w-full border border-white/80 bg-transparent py-3.5 text-[11px] font-medium uppercase tracking-widest text-white transition-all hover:border-white hover:bg-white/10 md:py-4 md:text-sm"
              style={{ letterSpacing: "0.2em" }}
              aria-label="Learn how SSELFIE works"
            >
              See how it works
            </button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#F6F5F3] px-4 py-16 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-12 text-center text-[17px] leading-[1.65] text-[#3A3A3C] md:mb-16 md:text-xl md:leading-relaxed"
            style={{ maxWidth: "800px", margin: "0 auto 3rem" }}
          >
            SSELFIE was created to make your life easier. You shouldn't have to book photoshoots, hire designers, or
            spend hours editing. Everything you need to build a clean, simple, consistent brand lives in one place.
          </p>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            <div className="text-center">
              <h3
                className="mb-3 font-serif text-[2rem] font-light text-[#000] md:mb-4 md:text-3xl"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Visibility = Trust
              </h3>
              <p
                className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base"
                style={{ maxWidth: "380px", margin: "0 auto" }}
              >
                When people see you consistently, they start to trust you. It's that simple.
              </p>
            </div>

            <div className="text-center">
              <h3
                className="mb-3 font-serif text-[2rem] font-light text-[#000] md:mb-4 md:text-3xl"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Consistency = Growth
              </h3>
              <p
                className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base"
                style={{ maxWidth: "380px", margin: "0 auto" }}
              >
                Show up the same way every time, and your audience grows with you.
              </p>
            </div>

            <div className="text-center">
              <h3
                className="mb-3 font-serif text-[2rem] font-light text-[#000] md:mb-4 md:text-3xl"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Identity = Confidence
              </h3>
              <p
                className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base"
                style={{ maxWidth: "380px", margin: "0 auto" }}
              >
                When your photos feel like you, showing up online gets easier.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-20">
          {/* Left: Text Content */}
          <div className="space-y-4 md:space-y-6">
            <h2
              className="font-serif text-[2.5rem] font-light leading-[1.15] text-[#000] md:text-5xl md:leading-tight lg:text-6xl xl:text-7xl"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Meet the woman you're building toward.
            </h2>
            <p className="max-w-xl text-[15px] leading-[1.8] text-[#3A3A3C] md:text-[16px] md:leading-[1.8]">
              Upload selfies. Watch the woman you're becoming take shape, in real time.
            </p>
          </div>

          {/* Right: Before/After Image Transition */}
          <div className="relative">
            {/* Before Image (Background) */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
              <Image
                src="/images/1.png"
                alt="Casual selfie showing authentic starting point for brand transformation"
                width={600}
                height={800}
                className="object-cover object-center"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* After Image (Overlay with hover effect) */}
            <div className="absolute inset-0 aspect-[3/4] overflow-hidden rounded-sm opacity-0 transition-opacity duration-700 hover:opacity-100">
              <Image
                src="/images/2.png"
                alt="Professional portrait showing polished brand transformation result"
                width={600}
                height={800}
                className="object-cover object-center"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Subtle indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur-sm md:text-sm">
              Hover to see transformation
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FEATURES GRID */}
      <section className="bg-[#F6F5F3] px-4 py-16 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <h2
            className="mb-12 text-center font-serif text-[2.5rem] font-light text-[#000] md:mb-16 md:text-5xl lg:text-6xl"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Everything You Need
          </h2>

          <div className="grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
            {/* Feature 1 - AI Selfie Portrait Studio */}
            <div className="group">
              <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-white md:mb-6">
                <Image
                  src="/images/mobile-20app-20ui.jpeg"
                  alt="SSELFIE mobile app interface showing AI photo gallery and generation tools"
                  width={800}
                  height={600}
                  className="h-full w-full rounded-sm object-cover"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <h3
                className="mb-2 font-serif text-[1.75rem] font-light text-[#000] md:mb-3 md:text-3xl"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                AI Selfie Portrait Studio
              </h3>
              <p className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base">
                Take a selfie, get professional photos. No photographer needed, no appointments to book.
              </p>
            </div>

            {/* Feature 2 - Aesthetic Lifestyle Content */}
            <div className="group">
              <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-white md:mb-6">
                <Image
                  src="/images/coffeelifestyle.png"
                  alt="Woman creating lifestyle content at a coffee shop using SSELFIE"
                  width={800}
                  height={600}
                  className="h-full w-full rounded-sm object-cover"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <h3
                className="mb-2 font-serif text-[1.75rem] font-light text-[#000] md:mb-3 md:text-3xl"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Aesthetic Lifestyle Content
              </h3>
              <p className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base">
                Create the content you've been scrolling past. Coffee shop moments, work-from-home setups, and everyday
                scenes that feel like you.
              </p>
            </div>

            {/* Feature 3 - Brand Story Builder */}
            <div>
              <h3
                className="mb-2 font-serif text-[1.75rem] font-light text-[#000] md:mb-3 md:text-3xl"
                style={{ fontFamily: "Cormorant Garamond, serif" }}
              >
                Brand Story Builder
              </h3>
              <p className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base">
                Get help writing your story. From about pages to Instagram captions, everything sounds like you and
                looks like you.
              </p>
            </div>

            {/* Feature 4 - B-roll Video Creator */}
            <div>
              <h3
                className="mb-2 font-serif text-[1.75rem] font-light text-[#000] md:mb-3 md:text-3xl"
                style={{ fontFamily: "'Times New Roman', Times, serif", letterSpacing: "0.15em" }}
              >
                B-roll Video Creator
              </h3>
              <p className="text-[15px] leading-[1.7] text-[#3A3A3C] md:text-base">
                Turn photos into videos for your feed. Quick clips that look good and feel natural.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 md:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center md:mb-16">
            <h2
              className="font-serif text-[2.5rem] font-light text-[#000] md:text-5xl lg:text-6xl"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Real women. Real transformations.
            </h2>
          </div>
          <TestimonialGrid />
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-24 bg-[#F6F5F3] px-4 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center md:mb-16">
            <p
              className="mb-3 text-xs uppercase tracking-[0.25em] text-[#3A3A3C] md:mb-4 md:text-xs"
              style={{ letterSpacing: "0.25em" }}
            >
              LUXURY BRAND PHOTOGRAPHY
            </p>
            <h2
              className="mb-4 font-serif text-[2rem] font-light uppercase tracking-wide text-[#000] md:mb-6 md:text-[2.5rem]"
              style={{ fontFamily: "'Times New Roman', Times, serif", letterSpacing: "0.15em" }}
            >
              Your Brand Photo Studio
            </h2>
            <p className="px-4 text-base font-light leading-relaxed text-[#3A3A3C] md:text-lg">
              Professional brand photography without the photoshoot.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {/* One-Time Session */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
              <p className="mb-2 text-xs font-light uppercase tracking-[0.25em] text-[#3A3A3C] md:text-sm">
                ONE-TIME SESSION
              </p>
              <div className="mb-6 md:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl font-light md:text-6xl"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $49
                  </span>
                </div>
                <p className="mt-2 text-sm font-light text-[#3A3A3C] md:text-base">one-time • 70 credits</p>
              </div>
              <div className="mb-8 space-y-3 md:mb-10 md:space-y-4">
                <p className="text-base font-light text-[#3A3A3C] md:text-lg">
                  Trained model that looks exactly like you
                </p>
                <p className="text-base font-light text-[#3A3A3C] md:text-lg">Basic Maya AI assistant</p>
                <p className="text-base font-light text-[#3A3A3C] md:text-lg">Perfect for testing</p>
              </div>
              <button
                onClick={() => {
                  fetch("/api/events/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event_name: "pricing_try_once_clicked", event_value: "one_time_session" }),
                  }).catch(() => {})
                  handleStartCheckout("one_time_session")
                }}
                disabled={checkoutLoading === "one_time_session"}
                className="min-h-[44px] w-full rounded-lg bg-[#000] px-6 py-3 text-xs font-medium uppercase tracking-wider text-white transition-all duration-200 hover:bg-[#3A3A3C] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                aria-label="Try SSELFIE one-time session for $49"
              >
                {checkoutLoading === "one_time_session" ? "LOADING..." : "TRY ONCE"}
              </button>
            </div>

            {/* Studio Membership */}
            <div className="relative rounded-2xl bg-[#000] p-6 text-white md:p-8">
              <p className="mb-2 text-xs font-light uppercase tracking-[0.25em] text-stone-300 md:text-sm">
                SSELFIE STUDIO
              </p>
              <div className="mb-6 md:mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-5xl font-light md:text-6xl"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    $99
                  </span>
                  <span className="text-base text-stone-400 md:text-lg">/month</span>
                </div>
                <p className="mt-2 text-sm font-light text-stone-300 md:text-base">150 credits monthly</p>
              </div>
              <div className="mb-8 space-y-3 md:mb-10 md:space-y-4">
                <p className="text-base font-light text-stone-100 md:text-lg">
                  Trained model that looks exactly like you
                </p>
                <p className="text-base font-light text-stone-100 md:text-lg">Full Maya AI assistant access</p>
                <p className="text-base font-light text-stone-100 md:text-lg">Complete Brand Academy</p>
                <p className="text-base font-light text-stone-100 md:text-lg">Instagram feed designer</p>
                <p className="text-base font-light text-stone-100 md:text-lg">Monthly content strategy</p>
              </div>
              <button
                onClick={() => {
                  fetch("/api/events/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event_name: "pricing_join_studio_clicked",
                      event_value: "sselfie_studio_membership",
                    }),
                  }).catch(() => {})
                  handleStartCheckout("sselfie_studio_membership")
                }}
                disabled={checkoutLoading === "sselfie_studio_membership"}
                className="min-h-[44px] w-full rounded-lg bg-white px-6 py-3 text-xs font-medium uppercase tracking-wider text-[#000] transition-all duration-200 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                aria-label="Join SSELFIE Studio membership for $99 per month"
              >
                {checkoutLoading === "sselfie_studio_membership" ? "LOADING..." : "JOIN STUDIO"}
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-4 text-center md:mt-12">
            <p className="text-base font-light text-[#000] md:text-lg">
              <strong className="font-medium">30-Day Money-Back Guarantee</strong>
            </p>
            <p className="px-4 text-sm font-light text-[#3A3A3C] md:text-base">
              Professional pricing • Cancel anytime • Add credits anytime
            </p>
          </div>
        </div>
      </section>

      {/* Section 7 - Final CTA */}
      <section className="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
        <Image
          src="/images/power-blazer-brand.png"
          alt="Confident woman in tailored suit representing the future self you're building toward"
          fill
          className="object-cover object-center"
          loading="lazy"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center md:px-6">
          <h2
            className="mb-6 font-serif text-[2.25rem] font-light leading-[1.15] text-white md:mb-8 md:text-5xl lg:text-6xl xl:text-7xl"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            Your future self is waiting inside.
          </h2>
          <button
            onClick={() => {
              fetch("/api/events/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_name: "final_cta_enter_studio_clicked", event_value: "one_time_session" }),
              }).catch(() => {})
              handleStartCheckout("one_time_session")
            }}
            disabled={checkoutLoading === "one_time_session"}
            className="bg-white px-10 py-4 text-[11px] font-medium uppercase tracking-widest text-[#000] transition-all hover:bg-[#F6F5F3] disabled:opacity-50 md:px-12 md:py-5 md:text-sm"
            style={{ letterSpacing: "0.2em" }}
            aria-label="Enter the SSELFIE Studio and create your future self"
          >
            {checkoutLoading === "one_time_session" ? "Loading..." : "Enter the Studio"}
          </button>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-stone-100 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
            <div>
              <a
                href="/"
                className="text-xl font-light uppercase tracking-[0.25em] text-stone-900 md:text-2xl"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                SSELFIE
              </a>
              <p className="text-sm font-light leading-relaxed text-stone-600 md:text-base">
                Professional brand photos every month. No photographer needed. Built by Sandra, a single mom who turned
                selfies into a business.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-light uppercase tracking-[0.25em] text-stone-500 md:mb-6 md:text-sm">
                QUICK LINKS
              </h3>
              <div className="flex flex-col gap-3 md:gap-4">
                <Link
                  href="/privacy"
                  className="text-sm font-light uppercase tracking-wider text-stone-600 transition-colors hover:text-stone-950 md:text-base"
                >
                  PRIVACY
                </Link>
                <Link
                  href="/terms"
                  className="text-sm font-light uppercase tracking-wider text-stone-600 transition-colors hover:text-stone-950 md:text-base"
                >
                  TERMS
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="text-sm font-light uppercase tracking-wider text-stone-600 transition-colors hover:text-stone-950 md:text-base"
                >
                  SIGN UP
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-light uppercase tracking-[0.25em] text-stone-500 md:mb-6 md:text-sm">
                CONNECT
              </h3>
              <div className="flex flex-col gap-3 md:gap-4">
                <a
                  href="mailto:hello@sselfie.ai"
                  className="text-sm font-light text-stone-600 transition-colors hover:text-stone-950 md:text-base"
                >
                  hello@sselfie.ai
                </a>
                <a
                  href="https://instagram.com/sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-light text-stone-600 transition-colors hover:text-stone-950 md:text-base"
                >
                  <span>Instagram</span>
                  <span className="text-xs md:text-sm">@sandra.social</span>
                </a>
                <a
                  href="https://tiktok.com/@sandra.social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-light text-stone-600 transition-colors hover:text-stone-950 md:text-base"
                >
                  <span>TikTok</span>
                  <span className="text-xs md:text-sm">@sandra.social</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-8 md:pt-10">
            <p className="text-center text-xs font-light text-stone-500 md:text-sm">
              © 2025 SSELFIE. All rights reserved. Made with love by Sandra.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
