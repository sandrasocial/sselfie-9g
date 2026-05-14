"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  trackCTAClick,
  trackPricingView,
  trackCheckoutStart,
  trackLandingView,
  trackSelfieGuideEntryClick,
} from "@/lib/analytics"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import { handleCheckoutFailure } from "@/lib/checkout-failure"
import TestimonialCarousel from "@/components/testimonials/testimonial-carousel"
import { formatPriceFromCents, getProductById } from "@/lib/products"
import { appendReferralParam, buildReferralLoginHref, persistReferralCode } from "@/lib/referrals/routing"

export default function LandingPageNew({ referralCode }: { referralCode?: string | null }) {
  const [activeScene, setActiveScene] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scenesRef = useRef<(HTMLDivElement | null)[]>([])
  const selfieGuideProduct = getProductById("selfie_guide")
  const membershipProduct = getProductById("sselfie_studio_membership")
  const selfieGuidePrice = selfieGuideProduct
    ? formatPriceFromCents(selfieGuideProduct.priceInCents, { currency: "usd" })
    : "$17"
  const membershipPrice = membershipProduct
    ? formatPriceFromCents(membershipProduct.priceInCents, { currency: "eur" })
    : "€97"
  const loginHref = buildReferralLoginHref({ returnTo: "/studio", referralCode })
  const selfieGuideHref = appendReferralParam("/selfie-guide", referralCode)

  const totalScenes = 8

  useEffect(() => {
    trackLandingView()
  }, [])

  useEffect(() => {
    persistReferralCode(referralCode)
  }, [referralCode])

  // Track pricing section view
  useEffect(() => {
    const pricingSection = document.getElementById("membership")
    if (!pricingSection) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackPricingView()
            observer.disconnect()
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(pricingSection)
    return () => observer.disconnect()
  }, [])

  // Update active scene based on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const scrollTop = containerRef.current.scrollTop
      const sceneHeight = containerRef.current.clientHeight
      const currentScene = Math.round(scrollTop / sceneHeight)

      if (currentScene !== activeScene && currentScene >= 0 && currentScene < totalScenes) {
        setActiveScene(currentScene)
      }

      // Show sticky footer after scrolling past first scene
      setShowStickyFooter(scrollTop > sceneHeight)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [activeScene, totalScenes])

  // Fade-up animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.2 }
    )

    const fadeElements = document.querySelectorAll(".fade-up")
    fadeElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const handleStartCheckout = async (tierId: string) => {
    try {
      setCheckoutLoading(tierId)

      const productNames: Record<string, string> = {
        sselfie_studio_membership: "Studio Membership",
      }
      const productName = productNames[tierId] || tierId
      trackCheckoutStart(tierId, undefined)
      trackCTAClick("pricing", productName, "/checkout")

      const clientSecret = await startEmbeddedCheckout(tierId)
      window.location.href = `/checkout?client_secret=${clientSecret}`
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Checkout error:", error)
      }
      handleCheckoutFailure({
        error,
        source: "landing_new_pricing",
        productId: tierId,
        fallbackPath: "/checkout/membership",
      })
      setCheckoutLoading(null)
    }
  }

  const scrollToPricing = () => {
    const pricingSection = document.getElementById("membership")
    if (pricingSection && containerRef.current) {
      const sceneIndex = 5 // Pricing is scene 6 (0-indexed = 5)
      const sceneHeight = containerRef.current.clientHeight
      containerRef.current.scrollTo({
        top: sceneIndex * sceneHeight,
        behavior: "smooth",
      })
    }
  }

  const scrollToScene = (index: number) => {
    if (containerRef.current) {
      const sceneHeight = containerRef.current.clientHeight
      containerRef.current.scrollTo({
        top: index * sceneHeight,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="min-h-screen bg-brand-obsidian overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-5 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center pointer-events-none bg-[color:var(--glass-bg)] backdrop-blur-[50px] border-b border-[color:var(--div-dark)]">
        <div className="pointer-events-auto" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          <Link href="/" className="text-xl text-brand-porcelain tracking-[0.3em] uppercase font-light">
            SSELFIE
          </Link>
        </div>
        <Link
          href={loginHref}
          className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-stone hover:text-brand-whisper transition-colors py-2"
          onClick={() => trackCTAClick("nav", "Login", loginHref)}
        >
          Login
        </Link>
      </nav>

      {/* Main Snap Scroll Container */}
      <main
        ref={containerRef}
        className="snap-container"
        style={{
          scrollSnapType: "y mandatory",
          overflowY: "scroll",
          height: "100dvh",
          scrollBehavior: "smooth",
        }}
      >
        {/* SCENE 1: HERO */}
        <section
          ref={(el) => (scenesRef.current[0] = el)}
          className="scene"
          style={{
            minHeight: "100dvh",
            width: "100vw",
            position: "relative",
            scrollSnapAlign: "start",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png')",
              backgroundPosition: "50% 25%",
            }}
          />
          {/* Gradient heavier at the bottom so text sits on a dark base, face stays clear */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.72) 100%)",
            }}
          />

          {/* flex:1 fills the section height; justifyContent overrides scoped .content CSS */}
          <div className="content text-center" style={{ flex: 1, justifyContent: "flex-end" }}>
            {/* Social proof pill */}
            <div
              className="fade-up inline-flex items-center gap-2 mx-auto mb-6"
              style={{
                background: "rgba(10, 10, 10, 0.6)",
                backdropFilter: "blur(20px)",
                border: "1px solid var(--div-dark)",
                borderRadius: "100px",
                padding: "6px 16px",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-whisper inline-block" />
              <span
                className="text-[10px] uppercase tracking-[0.2em] text-brand-whisper"
                style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
              >
                180K+ creators following
              </span>
            </div>

            <h1
              className="hero-title fade-up"
              style={{
                fontStyle: "normal",
                fontWeight: 300,
                textShadow: "0 2px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Brand photos, feed plans, and captions — done by an AI that knows you.
            </h1>

            <p
              className="description fade-up mx-auto max-w-sm"
              style={{
                color: "var(--color-whisper)",
                textShadow: "0 1px 8px rgba(0,0,0,0.55)",
              }}
            >
              Meet Maya. Your personal brand AI. Upload a selfie, and she creates photos, plans your feed, and writes your captions — all in your style.
            </p>

            <div
              className="fade-up"
              style={{
                transitionDelay: "0.2s",
                marginTop: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <Link
                href={selfieGuideHref}
                onClick={() => trackSelfieGuideEntryClick("hero")}
                className="btn shadow-xl"
              >
                Start with the Selfie Guide — {selfieGuidePrice}
              </Link>
              <a
                href="#membership"
                onClick={(e) => {
                  e.preventDefault()
                  trackCTAClick("hero", "See Studio", "#membership")
                  scrollToPricing()
                }}
                className="text-[10px] uppercase tracking-[0.2em] text-brand-whisper hover:text-brand-porcelain transition-colors py-2"
              >
                See what&apos;s inside →
              </a>
            </div>
          </div>
        </section>

        {/* SCENE 2: HOW IT WORKS */}
        <section
          ref={(el) => (scenesRef.current[1] = el)}
          className="scene"
          style={{
            minHeight: "100dvh",
            backgroundColor: "var(--stone-dark)",
            color: "var(--color-porcelain)",
            position: "relative",
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "0 24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "48px",
            }}
            className="md:flex-row md:gap-16"
          >
            {/* Visual Container */}
            <div
              className="w-full md:w-1/2 relative fade-up md:h-[520px]"
              style={{ height: "340px" }}
            >
              {/* Input */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "72%",
                  height: "72%",
                  overflow: "hidden",
                  border: "1px solid var(--div-dark)",
                  filter: "grayscale(100%)",
                  transition: "filter 0.7s",
                }}
                className="hover:grayscale-0"
              >
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/8239-hQrbpFYBbCHzcY8YQ95YKqqpZmbdbW.png"
                  className="w-full h-full object-cover"
                  alt="Input selfie"
                  loading="lazy"
                  style={{ opacity: 0.8 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "rgba(10, 10, 10, 0.8)",
                    backdropFilter: "blur(8px)",
                    padding: "4px 10px",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    border: "1px solid rgba(195,190,182,0.2)",
                    color: "var(--stone)",
                  }}
                >
                  Your selfie
                </div>
              </div>

              {/* Output */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "72%",
                  height: "72%",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                  zIndex: 10,
                  border: "1px solid var(--div-dark)",
                }}
                className="group"
              >
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt="Brand photo result"
                  loading="lazy"
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    right: "12px",
                    background: "var(--color-whisper)",
                    color: "var(--color-obsidian)",
                    padding: "4px 12px",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: "bold",
                  }}
                >
                  Brand photo
                </div>
              </div>
            </div>

            {/* Text */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center fade-up md:p-8"
              style={{ padding: "0 0 24px" }}
            >
              <span className="label fade-up">How it works</span>
              <h2
                className="hero-title fade-up"
                style={{
                  fontSize: "clamp(28px,5vw,40px)",
                  marginBottom: "16px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                }}
              >
                From selfie to brand photo in minutes.
              </h2>
              <div className="description fade-up text-sm md:text-base space-y-4" style={{ color: "var(--stone)" }}>
                <p>
                  <strong style={{ color: "var(--color-whisper)" }}>1. Upload a few selfies.</strong>
                  <br />
                  Maya learns your face, your style, your vibe.
                </p>
                <p>
                  <strong style={{ color: "var(--color-whisper)" }}>2. She creates your photo library.</strong>
                  <br />
                  Brand-ready images that actually look like you — no photoshoot needed.
                </p>
                <p>
                  <strong style={{ color: "var(--color-whisper)" }}>3. Plan and post with confidence.</strong>
                  <br />
                  Fill your feed, write captions, and show up consistently.
                </p>
              </div>
              <div className="fade-up mt-6">
                <Link
                  href={selfieGuideHref}
                  onClick={() => trackSelfieGuideEntryClick("how-it-works")}
                  className="btn"
                >
                  Start with the Selfie Guide →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 3: MEET MAYA */}
        <section
          ref={(el) => (scenesRef.current[2] = el)}
          className="scene"
          style={{
            minHeight: "100dvh",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1200px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px",
            }}
            className="md:flex-row md:gap-8 md:p-8"
          >
            {/* Photo generation */}
            <div
              className="relative bg-stone-900 border border-white/5 overflow-hidden md:w-1/2"
              style={{ width: "100%", aspectRatio: "1/1", flexShrink: 0 }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/8227-Y8Hi0TmnDBrZmgOGBbRXt1jk4eigZR.png"
                  alt="Maya generates brand photos"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ opacity: 0.7, display: "block" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, rgba(10, 10, 10, 0.1) 0%, rgba(10, 10, 10, 0.75) 100%)",
                  }}
                />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end items-start text-left p-8 pb-10">
                <span
                  className="text-[9px] uppercase tracking-[0.2em] mb-2"
                  style={{ color: "var(--stone)", fontFamily: "Inter, sans-serif" }}
                >
                  Photos
                </span>
                <h3
                  className="text-2xl md:text-3xl mb-2 text-brand-porcelain"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
                >
                  Photos that look like you, not stock.
                </h3>
                <p className="text-stone text-xs md:text-sm font-light leading-relaxed">
                  Maya trains on your selfies and generates brand photos in your exact style. She remembers what you love and what you don&apos;t.
                </p>
              </div>
            </div>

            {/* Feed planning */}
            <div
              className="relative bg-brand-obsidian overflow-hidden md:w-1/2"
              style={{ width: "100%", aspectRatio: "1/1", flexShrink: 0 }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png"
                  alt="Feed planning with Maya"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ opacity: 0.7, display: "block" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, rgba(10, 10, 10, 0.1) 0%, rgba(10, 10, 10, 0.75) 100%)",
                  }}
                />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end items-start text-left p-8 pb-10">
                <span
                  className="text-[9px] uppercase tracking-[0.2em] mb-2"
                  style={{ color: "var(--stone)", fontFamily: "Inter, sans-serif" }}
                >
                  Feed Planner
                </span>
                <h3
                  className="text-2xl md:text-3xl mb-2 text-brand-porcelain"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
                >
                  Your next 9 posts, planned and captioned.
                </h3>
                <p className="text-stone text-xs md:text-sm font-light leading-relaxed">
                  Maya builds your feed strategy, writes your captions, and keeps your grid looking cohesive — without the Sunday-night stress.
                </p>
              </div>
            </div>
          </div>

          {/* Section label */}
          <div
            className="absolute top-8 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full shadow-xl"
            style={{
              background: "rgba(10, 10, 10, 0.92)",
              border: "1px solid var(--div-dark)",
              backdropFilter: "blur(50px)",
            }}
          >
            <span
              className="text-[9px] uppercase tracking-widest whitespace-nowrap"
              style={{ color: "var(--stone)" }}
            >
              Meet Maya
            </span>
          </div>
        </section>

        {/* SCENE 4: WHO IT'S FOR */}
        <section
          ref={(el) => (scenesRef.current[3] = el)}
          className="scene"
          style={{
            minHeight: "100dvh",
            backgroundColor: "var(--stone-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1200px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px",
            }}
            className="md:flex-row md:gap-8 md:p-8"
          >
            {/* Image */}
            <div
              className="w-full md:w-1/2 relative overflow-hidden"
              style={{ aspectRatio: "1/1", flexShrink: 0 }}
            >
              <img
                src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/tmpbmq4nfg7.png"
                alt="SSELFIE Studio"
                loading="lazy"
                className="w-full h-full object-cover"
                style={{ display: "block" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(44, 43, 41, 0.10) 0%, rgba(44, 43, 41, 0.40) 100%)",
                }}
              />
            </div>

            {/* Text */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center fade-up"
              style={{ padding: "24px 0" }}
            >
              <div
                className="border-l pl-6 fade-up"
                style={{ borderColor: "var(--div-dark)" }}
              >
                <span className="label" style={{ marginBottom: "8px" }}>
                  Who it&apos;s for
                </span>
                <h2
                  className="hero-title"
                  style={{
                    fontSize: "clamp(28px,5vw,40px)",
                    marginBottom: "20px",
                    fontFamily: "'Cormorant Garamond', serif",
                  }}
                >
                  You don&apos;t need a photographer, a big team, or hours to spare.
                </h2>
                <div
                  className="description text-sm md:text-base mb-4 space-y-3"
                  style={{ color: "var(--stone)" }}
                >
                  <p>✓ Coaches, creators, and entrepreneurs who want to be visible</p>
                  <p>✓ Women building a personal brand without a team behind them</p>
                  <p>✓ Anyone who&apos;s been hiding behind their logo or skipping posts</p>
                </div>
                <p
                  className="description text-sm md:text-base italic"
                  style={{ color: "var(--stone)", fontSize: "14px" }}
                >
                  If you&apos;ve been overthinking every post — SSELFIE gives you a clear, repeatable system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 5: TESTIMONIALS */}
        <section
          ref={(el) => (scenesRef.current[4] = el)}
          className="scene"
          style={{
            minHeight: "100dvh",
            backgroundColor: "var(--color-obsidian)",
            paddingTop: "60px",
            paddingBottom: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              margin: "0 auto",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <span className="label fade-up text-center w-full mb-4">Real results</span>
            <h2
              className="hero-title fade-up text-center mb-6"
              style={{ fontSize: "clamp(28px,5vw,40px)", fontFamily: "'Cormorant Garamond', serif" }}
            >
              See what members are creating.
            </h2>
            <div className="w-full overflow-hidden">
              <TestimonialCarousel />
            </div>
          </div>
        </section>

        {/* SCENE 6: PRICING */}
        <section
          id="membership"
          ref={(el) => (scenesRef.current[5] = el)}
          className="scene"
          style={{ minHeight: "100dvh", position: "relative" }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/xjn21cxbtdrmt0cvdxpsx38cnw-Z4oXOAZDQKa9g4KGDjiEYtRGQl5moM.png')",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, var(--color-obsidian) 10%, rgba(10, 10, 10, 0.85) 60%, rgba(10, 10, 10, 0.7) 100%)",
            }}
          />
          <div className="h-full w-full overflow-y-auto relative z-10">
            <div className="content h-full justify-center min-h-dvh">
              <span className="label text-center w-full fade-up mt-8 md:mt-0">
                Simple pricing
              </span>
              <h2
                className="hero-title text-center mb-3 fade-up"
                style={{
                  fontSize: "clamp(28px,5vw,40px)",
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                Start small. Grow into it.
              </h2>
              <p className="description text-center mb-8 fade-up" style={{ color: "var(--stone)" }}>
                Pick the Selfie Guide to get started, or jump straight into Studio for the full system.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  width: "100%",
                  maxWidth: "800px",
                  margin: "0 auto",
                }}
                className="md:flex-row md:gap-8"
              >
                {/* Selfie Guide Card */}
                <div className="pricing-card fade-up relative overflow-hidden flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3
                        className="text-lg font-serif text-white mb-1"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
                      >
                        Selfie Guide
                      </h3>
                      <p className="text-stone-500 text-[10px] uppercase tracking-wider">
                        Start here
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-2xl"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--color-porcelain)" }}
                      >
                        {selfieGuidePrice}
                      </span>
                      <span className="text-[9px] uppercase text-stone-500 block">one-time</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                    <p>• The selfie framework Sandra uses herself</p>
                    <p>• 7-day challenge to get you moving fast</p>
                    <p>• Instant access right after payment</p>
                  </div>
                  <Link
                    href={selfieGuideHref}
                    onClick={() => trackSelfieGuideEntryClick("pricing")}
                    className="btn w-full text-[10px] text-center"
                  >
                    Get the Guide
                  </Link>
                </div>

                {/* Studio Card */}
                <div className="pricing-card fade-up relative overflow-hidden flex-1" style={{ border: "1px solid var(--div-dark)" }}>
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-whisper" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3
                        className="text-lg font-serif text-white mb-1"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
                      >
                        Studio Membership
                      </h3>
                      <p className="text-stone-400 text-[10px] uppercase tracking-wider">
                        Full system
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-2xl"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--color-porcelain)" }}
                      >
                        {membershipPrice}
                      </span>
                      <span className="text-[9px] uppercase text-stone-500 block">/ month</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                    <p>• Maya — your AI that learns and remembers your brand</p>
                    <p>• Fresh brand photos every month</p>
                    <p>• Feed Planner + captions for your whole grid</p>
                    <p>• Academy courses included</p>
                    <p>• Cancel anytime</p>
                  </div>
                  <button
                    onClick={() => handleStartCheckout("sselfie_studio_membership")}
                    disabled={checkoutLoading === "sselfie_studio_membership"}
                    className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading === "sselfie_studio_membership" ? "Loading..." : "Join Studio →"}
                  </button>
                </div>
              </div>

              <p className="text-center text-[9px] text-stone-500 mt-3 fade-up pb-8 md:pb-0 font-light">
                No tech skills needed. Cancel Studio anytime from your account settings.
              </p>
            </div>
          </div>
        </section>

        {/* SCENE 7: FOUNDER */}
        <section
          ref={(el) => (scenesRef.current[6] = el)}
          className="scene"
          style={{ minHeight: "100dvh", backgroundColor: "var(--stone-dark)" }}
        >
          <div className="content h-full justify-center">
            <div className="fade-up">
              <span className="label mb-4">From Sandra</span>
              <h2
                className="hero-title mb-6"
                style={{
                  fontSize: "clamp(24px,4vw,36px)",
                  fontFamily: "'Cormorant Garamond', serif",
                }}
              >
                &quot;I built SSELFIE because showing up online used to feel impossible.&quot;
              </h2>
              <div
                className="relative max-w-[240px] mx-auto mb-6 overflow-hidden"
                style={{ aspectRatio: "3/4", borderRadius: "4px" }}
              >
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png"
                  alt="Sandra — Founder of SSELFIE"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ display: "block" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(44, 43, 41, 0.10) 0%, rgba(44, 43, 41, 0.35) 100%)",
                  }}
                />
              </div>
              <p className="description mb-4" style={{ color: "var(--stone)", maxWidth: "480px" }}>
                I was tired of hiding behind my logo and filters. I wanted something that helped me — and other women — feel confident and consistent online without needing a whole production.
                <br /><br />
                That&apos;s what SSELFIE Studio is. I use it myself, every week.
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--color-smoke)" }}>
                — Sandra, Founder
              </p>
            </div>
          </div>
        </section>

        {/* SCENE 8: FOOTER */}
        <section
          ref={(el) => (scenesRef.current[7] = el)}
          className="scene relative h-auto min-h-[50dvh] py-16"
          style={{ backgroundColor: "var(--color-obsidian)", color: "var(--stone)" }}
        >
          <div className="container mx-auto px-6 max-w-4xl h-full flex flex-col justify-center">
            {/* Closing CTA */}
            <div className="text-center mb-12 fade-up">
              <h2
                className="hero-title mb-6"
                style={{
                  fontSize: "clamp(28px,5vw,40px)",
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "var(--color-porcelain)",
                }}
              >
                You don&apos;t need perfect photos. You just need to show up.
              </h2>
              <Link
                href={selfieGuideHref}
                onClick={() => trackSelfieGuideEntryClick("closing")}
                className="btn"
              >
                Start with the Selfie Guide →
              </Link>
            </div>

            {/* FAQ */}
            <div
              className="grid gap-8 mb-12 pb-12"
              style={{ borderBottom: "1px solid var(--glass-bg)" }}
            >
              <div>
                <h4
                  className="text-lg mb-4"
                  style={{ color: "var(--color-porcelain)", fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Common questions
                </h4>
                <div className="space-y-4 text-xs font-light leading-relaxed">
                  <div>
                    <p className="mb-1" style={{ color: "var(--color-whisper)" }}>
                      Do I need to be good at taking photos?
                    </p>
                    <p>No. The Selfie Guide teaches you the basics. Maya does the rest.</p>
                  </div>
                  <div>
                    <p className="mb-1" style={{ color: "var(--color-whisper)" }}>
                      Are the photos mine to use?
                    </p>
                    <p>Yes. Everything you create is yours, forever.</p>
                  </div>
                  <div>
                    <p className="mb-1" style={{ color: "var(--color-whisper)" }}>
                      Can I cancel Studio?
                    </p>
                    <p>Yes, cancel anytime with one click from your account settings. No hoops.</p>
                  </div>
                  <div>
                    <p className="mb-1" style={{ color: "var(--color-whisper)" }}>
                      Is my payment secure?
                    </p>
                    <p>We use Stripe. We never see your card details.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer links */}
            <div
              className="flex flex-col gap-4 text-[10px] tracking-wider uppercase"
              style={{ color: "var(--stone)" }}
            >
              <div
                className="text-lg normal-case tracking-[0.3em] mb-2"
                style={{ color: "var(--color-porcelain)", fontFamily: "'Cormorant Garamond', serif" }}
              >
                SSELFIE
              </div>
              <div className="flex gap-6">
                <Link href="/terms" className="hover:text-brand-whisper transition-colors">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-brand-whisper transition-colors">
                  Privacy
                </Link>
              </div>
              <div className="mt-2">&copy; 2026 SSELFIE Studio</div>
            </div>
          </div>
        </section>
      </main>

      {/* Navigation Dots */}
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2.5"
      >
        {Array.from({ length: totalScenes }).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToScene(index)}
            className="w-1 h-1 rounded-full transition-all"
            style={{
              background: "var(--color-whisper)",
              opacity: activeScene === index ? 1 : 0.3,
              transform: activeScene === index ? "scale(1.5)" : "scale(1)",
            }}
            aria-label={`Go to scene ${index + 1}`}
          />
        ))}
      </div>

      {/* Sticky Footer — shows after hero */}
      {showStickyFooter && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 py-4 sm:py-5 shadow-lg"
          style={{
            background: "rgba(10, 10, 10, 0.95)",
            backdropFilter: "blur(50px)",
            borderTop: "1px solid var(--div-dark)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="text-center sm:text-left">
              <p
                className="text-base sm:text-lg font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--color-porcelain)" }}
              >
                SSELFIE Studio
              </p>
              <p className="text-[11px] font-light" style={{ color: "var(--stone)" }}>
                Brand photos + feed planner + Maya AI
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={selfieGuideHref}
                onClick={() => trackSelfieGuideEntryClick("sticky_footer")}
                className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider transition-all duration-200 min-h-[44px] flex items-center rounded-full"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid rgba(195,190,182,0.3)",
                  color: "var(--color-whisper)",
                }}
              >
                Selfie Guide — {selfieGuidePrice}
              </Link>
              <button
                onClick={() => {
                  trackCTAClick("sticky_footer", "Join Studio", "/checkout/membership")
                  handleStartCheckout("sselfie_studio_membership")
                }}
                disabled={checkoutLoading === "sselfie_studio_membership"}
                className="px-6 sm:px-8 py-3 text-[11px] font-medium uppercase tracking-wider transition-all duration-200 min-h-[44px] flex items-center rounded-full disabled:opacity-50"
                style={{ background: "var(--color-whisper)", color: "var(--color-obsidian)" }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = "var(--color-porcelain)"
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = "var(--color-whisper)"
                }}
              >
                {checkoutLoading === "sselfie_studio_membership" ? "Loading..." : "Join Studio →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .snap-container {
          scroll-snap-type: y mandatory;
          overflow-y: scroll;
          height: 100dvh;
          scroll-behavior: smooth;
        }
        .scene {
          min-height: 100dvh;
          width: 100vw;
          position: relative;
          scroll-snap-align: start;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .content {
          position: relative;
          z-index: 10;
          padding: 24px 20px;
          padding-top: calc(64px + env(safe-area-inset-top));
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
          width: 100%;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .content {
            padding: 80px 64px;
            max-width: 800px;
          }
        }
        .label {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10px;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: var(--stone);
          margin-bottom: 12px;
          display: block;
        }
        .hero-title {
          font-size: clamp(30px, 7vw, 56px);
          color: var(--color-porcelain);
          margin-bottom: 16px;
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-style: normal;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .description {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          font-weight: 300;
          color: var(--stone);
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .description {
            font-size: 17px;
            margin-bottom: 32px;
          }
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 32px;
          min-height: 48px;
          background: var(--color-whisper);
          color: var(--color-obsidian);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 100px;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid var(--color-whisper);
          width: fit-content;
        }
        .btn:hover {
          background: var(--color-porcelain);
          border-color: var(--color-porcelain);
        }
        .btn:active {
          transform: scale(0.96);
          opacity: 0.9;
        }
        .btn.w-full {
          width: 100%;
        }
        @media (min-width: 768px) {
          .btn {
            padding: 18px 40px;
            font-size: 12px;
          }
        }
        .pricing-card {
          background: var(--glass-bg);
          border: 1px solid rgba(195, 190, 182, 0.2);
          backdrop-filter: blur(50px);
          padding: 24px;
          border-radius: 16px;
        }
        @media (min-width: 768px) {
          .pricing-card {
            padding: 32px;
          }
        }
        .fade-up {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        ::-webkit-scrollbar {
          display: none;
        }
        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
