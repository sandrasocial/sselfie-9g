"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { trackCTAClick, trackPricingView, trackCheckoutStart } from "@/lib/analytics"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import TestimonialCarousel from "@/components/testimonials/testimonial-carousel"

export default function LandingPageNew() {
  const [activeScene, setActiveScene] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scenesRef = useRef<(HTMLDivElement | null)[]>([])

  const totalScenes = 9

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
        one_time_session: "Starter Photoshoot",
        sselfie_studio_membership: "Creator Studio",
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
      alert("Failed to start checkout. Please try again.")
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
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-5 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
          <Link href="/" className="text-xl text-white tracking-[0.05em]">
            SSELFIE
          </Link>
        </div>
        <Link
          href="/auth/login"
          className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white opacity-90 hover:opacity-100 transition-opacity py-2"
          onClick={() => trackCTAClick("nav", "Login", "/auth/login")}
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
          height: "100vh",
          height: "100dvh",
          scrollBehavior: "smooth",
        }}
      >
        {/* SCENE 1: HERO */}
        <section
          ref={(el) => (scenesRef.current[0] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
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
              backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png')",
              backgroundPosition: "50% 25%",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
            }}
          />
          
          <div className="content text-center h-full justify-center">
            <span className="label fade-up" style={{ color: "#ffffff", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
              Your Studio
            </span>
            <h1
              className="hero-title fade-up"
              style={{
                fontStyle: "normal",
                fontWeight: 300,
                textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                fontFamily: "'Times New Roman', serif",
              }}
            >
              The easiest way to create content that looks and feels like you.
            </h1>
            <p className="description fade-up mx-auto max-w-sm" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}>
              SSELFIE Studio helps you make beautiful, on-brand photos and plan your social feed, even if you don't have time, confidence, or a big team.
            </p>
            <div className="fade-up" style={{ transitionDelay: "0.2s", marginTop: "10px" }}>
              <a
                href="#membership"
                onClick={(e) => {
                  e.preventDefault()
                  trackCTAClick("hero", "Try SSELFIE Studio", "#membership")
                  scrollToPricing()
                }}
                className="btn shadow-xl"
              >
                Try SSELFIE Studio →
              </a>
            </div>
            <p className="description fade-up mx-auto max-w-sm mt-4" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)", fontSize: "14px", marginTop: "16px" }}>
              Create photos. Plan your feed. Build your brand, all in one place.
            </p>
          </div>
        </section>

        {/* SCENE 2: THE MECHANISM */}
        <section
          ref={(el) => (scenesRef.current[1] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#1c1917",
            color: "white",
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
              gap: "64px",
            }}
            className="md:flex-row"
          >
            {/* Visual Container */}
            <div
              className="w-full md:w-1/2 relative fade-in-up md:h-[600px]"
              style={{
                height: "400px",
              }}
            >
              {/* Layer 1: Input Image (Top Left) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "75%",
                  height: "75%",
                  backgroundColor: "rgba(28, 25, 23, 0.2)",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  filter: "grayscale(100%)",
                  transition: "filter 0.7s",
                }}
                className="hover:grayscale-0"
              >
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/8239-hQrbpFYBbCHzcY8YQ95YKqqpZmbdbW.png"
                  className="w-full h-full object-cover"
                  alt="Input Selfie"
                  loading="lazy"
                  style={{ opacity: 0.8 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "16px",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    backdropFilter: "blur(8px)",
                    padding: "4px 12px",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  Input: Selfie
                </div>
              </div>

              {/* Layer 2: Output Image (Bottom Right) */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: "75%",
                  height: "75%",
                  backgroundColor: "#1c1917",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  zIndex: 10,
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
                className="group"
              >
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt="Output Editorial"
                  loading="lazy"
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    right: "16px",
                    backgroundColor: "white",
                    color: "#1c1917",
                    padding: "6px 16px",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: "bold",
                  }}
                >
                  Result: Editorial
                </div>
              </div>
            </div>

            {/* Text Container */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center fade-in-up md:p-16"
              style={{
                padding: "24px",
              }}
            >
              <span className="label fade-up">How it works</span>
              <h2
                className="hero-title fade-up"
                style={{
                  fontSize: "32px",
                  marginBottom: "12px",
                  fontFamily: "'Times New Roman', serif",
                  fontWeight: "normal",
                }}
              >
                How it works
              </h2>
              <div className="description fade-up text-sm md:text-base space-y-3" style={{ color: "#d6d3d1" }}>
                <p><strong>Step 1:</strong> Upload a few selfies (or your favorite photos).</p>
                <p><strong>Step 2:</strong> SSELFIE creates a library of brand-ready images that look like you.</p>
                <p><strong>Step 3:</strong> Use the feed planner to design your Instagram grid and stay consistent.</p>
              </div>
              <div className="fade-up mt-6">
                <a
                  href="#membership"
                  onClick={(e) => {
                    e.preventDefault()
                    trackCTAClick("how-it-works", "Start your first studio session", "#membership")
                    scrollToPricing()
                  }}
                  className="btn"
                >
                  Start your first studio session →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 3: WHY CREATORS LOVE SSELFIE */}
        <section
          ref={(el) => (scenesRef.current[2] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
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
            {/* Classic Mode */}
            <div
              className="relative bg-stone-900 border border-white/5 overflow-hidden md:w-1/2"
              style={{
                width: "100%",
                aspectRatio: "1/1",
                flexShrink: 0,
              }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/8227-Y8Hi0TmnDBrZmgOGBbRXt1jk4eigZR.png"
                  alt="Maya Classic Mode"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ opacity: 0.7, display: "block" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, rgba(12, 10, 9, 0.3), rgba(12, 10, 9, 0.8))",
                  }}
                />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end items-center text-center p-8 pb-12 md:pb-16">
                <h3 className="text-2xl md:text-3xl mb-3 text-white" style={{ fontFamily: "'Times New Roman', serif" }}>
                  Realistic photos
                </h3>
                <p className="text-stone-300 text-xs md:text-sm max-w-xs font-light leading-relaxed mb-4">
                  Realistic photos that actually look like you, no filters, no weirdness.
                </p>
              </div>
            </div>

            {/* Pro Mode */}
            <div
              className="relative bg-black overflow-hidden md:w-1/2"
              style={{
                width: "100%",
                aspectRatio: "1/1",
                flexShrink: 0,
              }}
            >
              <div className="absolute inset-0">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png"
                  alt="Feed Planning"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ opacity: 0.7, display: "block" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.8))",
                  }}
                />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end items-center text-center p-8 pb-12 md:pb-16">
                <h3 className="text-2xl md:text-3xl mb-3 text-white" style={{ fontFamily: "'Times New Roman', serif" }}>
                  Easy feed planning
                </h3>
                <p className="text-stone-300 text-xs md:text-sm max-w-xs font-light leading-relaxed mb-4">
                  Drag, drop, and preview your next 30 days.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black border border-white/20 px-4 py-1.5 rounded-full shadow-xl">
            <span className="text-[9px] uppercase tracking-widest text-white whitespace-nowrap">Why creators love SSELFIE</span>
          </div>
        </section>

        {/* SCENE 4: FEED PLANNER */}
        <section
          ref={(el) => (scenesRef.current[3] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            position: "relative",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/tmpqolu9b5_.png')",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(0deg, rgba(12,10,9,0.4) 10%, rgba(12,10,9,0.2) 100%)",
            }}
          />
          <div className="content" style={{ position: "relative", zIndex: 10 }}>
            <span className="label fade-up" style={{ color: "rgba(255, 255, 255, 0.8)" }}>See It In Action</span>
            <h2 className="hero-title fade-up" style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif", color: "#fafaf9" }}>
              From selfie to studio-ready content
            </h2>
            <div className="description fade-up" style={{ color: "rgba(250, 250, 249, 0.9)" }}>
              <p>Upload. Create. Plan. Post. It's that simple.</p>
            </div>
            <div className="description fade-up mt-4" style={{ color: "rgba(250, 250, 249, 0.9)" }}>
              <p>Tools and lessons that teach you how to grow your visibility with confidence.</p>
            </div>
          </div>
        </section>

        {/* SCENE 5: ACADEMY */}
        <section
          ref={(el) => (scenesRef.current[4] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#44403c",
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
            {/* Image Container */}
            <div
              className="w-full md:w-1/2 relative overflow-hidden"
              style={{
                aspectRatio: "1/1",
                flexShrink: 0,
              }}
            >
              <img
                src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/tmpbmq4nfg7.png"
                alt="Academy"
                loading="lazy"
                className="w-full h-full object-cover"
                style={{ display: "block" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to bottom, rgba(68, 64, 60, 0.2) 0%, rgba(68, 64, 60, 0.4) 100%)",
                }}
              />
            </div>

            {/* Text Content */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center fade-in-up md:p-0"
              style={{
                padding: "24px",
              }}
            >
              <div className="border-l border-white/30 pl-6 fade-up">
                <span className="label" style={{ color: "rgba(255,255,255,0.6)", marginBottom: "8px" }}>
                  Who It's For
                </span>
                <h2
                  className="hero-title"
                  style={{
                    fontSize: "36px",
                    marginBottom: "20px",
                    fontFamily: "'Times New Roman', serif",
                    color: "white",
                  }}
                >
                  Made for creators, coaches, and entrepreneurs who want to:
                </h2>
                <div className="description text-white/90 text-sm md:text-base mb-4 space-y-2">
                  <p>• Show up online without the stress</p>
                  <p>• Have consistent, high-quality visuals</p>
                  <p>• Feel confident being seen and building their brand</p>
                </div>
                <p className="description text-white/80 text-sm md:text-base mb-6 italic">
                  If you're tired of overthinking every post, SSELFIE gives you a clear, simple system.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 6: PRICING */}
        <section
          id="membership"
          ref={(el) => (scenesRef.current[5] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            position: "relative",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/xjn21cxbtdrmt0cvdxpsx38cnw-Z4oXOAZDQKa9g4KGDjiEYtRGQl5moM.png')",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(0deg, #0c0a09 10%, rgba(12,10,9,0.85) 60%, rgba(12,10,9,0.7) 100%)",
            }}
          />
          <div className="h-full w-full overflow-y-auto relative z-10">
            <div className="content h-full justify-center min-h-[100dvh]">
              <span className="label text-center w-full fade-up mt-8 md:mt-0">Join SSELFIE Studio</span>
              <h2 className="hero-title text-center mb-4 fade-up" style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif" }}>
                Join SSELFIE Studio
              </h2>
              <p className="description text-center mb-8 fade-up" style={{ color: "rgba(250, 250, 249, 0.9)" }}>
                Everything you need to stay visible, in one membership.
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
                {/* Starter Photoshoot Card */}
                <div className="pricing-card fade-up relative overflow-hidden group flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-serif text-white">Starter Photoshoot</h3>
                      <p className="text-stone-400 text-[10px] uppercase tracking-wider">Try It First</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-serif">$49</span>
                      <span className="text-[9px] uppercase text-stone-500 block">one-time</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                    <p>• 50 professional brand photos</p>
                    <p>• Your AI model trained on your photos</p>
                  </div>
                  <button
                    onClick={() => handleStartCheckout("one_time_session")}
                    disabled={checkoutLoading === "one_time_session"}
                    className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading === "one_time_session" ? "Loading..." : "Get Started"}
                  </button>
                </div>

                {/* Creator Studio Card */}
                <div className="pricing-card fade-up relative overflow-hidden group flex-1">
                  <div className="absolute top-0 left-0 w-1 h-full bg-white" />
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-serif text-white">Creator Studio</h3>
                      <p className="text-stone-400 text-[10px] uppercase tracking-wider">Most Popular</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-serif">$97</span>
                      <span className="text-[9px] uppercase text-stone-500 block">/ month</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                    <p>• Fresh brand photos every month</p>
                    <p>• Feed planner</p>
                    <p>• Learning hub with short tutorials</p>
                    <p>• Monthly ideas and strategy drops</p>
                  </div>
                  <button
                    onClick={() => handleStartCheckout("sselfie_studio_membership")}
                    disabled={checkoutLoading === "sselfie_studio_membership"}
                    className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading === "sselfie_studio_membership" ? "Loading..." : "See Inside →"}
                  </button>
                </div>
              </div>

              {/* Credit Packs Link */}
              <div className="pricing-card fade-up border-stone-800 bg-transparent text-center py-4 mb-4 mt-4">
                <p className="text-stone-400 text-[10px] mb-2">Need extra credits?</p>
                <Link
                  href="/checkout/credits"
                  onClick={() => trackCTAClick("pricing", "See Credit Packs", "/checkout/credits")}
                  className="text-[10px] uppercase tracking-widest text-white border-b border-white/30 pb-1 hover:border-white transition"
                >
                  See Credit Packs
                </Link>
              </div>

              <p className="text-center text-[9px] text-stone-400 mt-2 fade-up pb-8 md:pb-0 font-light">
                Cancel anytime. No tech skills needed.
              </p>
            </div>
          </div>
        </section>

        {/* SCENE 7: TESTIMONIALS */}
        <section
          ref={(el) => (scenesRef.current[6] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#0c0a09",
            paddingTop: "60px",
            paddingBottom: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ 
            width: "100%", 
            maxWidth: "600px", 
            margin: "0 auto", 
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
            <span className="label fade-up text-center w-full mb-4">Real Results</span>
            <h2 className="hero-title fade-up text-center mb-6" style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif" }}>
              See What Members Are Creating
            </h2>
            <div className="w-full overflow-hidden">
              <TestimonialCarousel />
            </div>
          </div>
        </section>

        {/* SCENE 8: STORY */}
        <section
          ref={(el) => (scenesRef.current[7] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#1c1917",
          }}
        >
          <div className="content h-full justify-center">
            <div className="fade-up">
              <span className="label mb-4">Founder Message</span>
              <h2 className="hero-title mb-6" style={{ fontSize: "36px", fontFamily: "'Times New Roman', serif" }}>
                "I built SSELFIE because showing up online used to feel impossible."
              </h2>
              <div className="relative aspect-[3/4] max-w-[280px] mx-auto mb-6 rounded-lg overflow-hidden">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png"
                  alt="Sandra - Founder of SSELFIE"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ display: "block" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, rgba(28, 25, 23, 0.2) 0%, rgba(28, 25, 23, 0.4) 100%)",
                  }}
                />
              </div>
              <p className="description text-stone-300 mb-4">
                I was tired of hiding behind my logo and filters. I wanted something that helped me, and other women, feel confident and consistent online. That's what SSELFIE Studio is.
              </p>
              <p className="text-xs text-stone-400 mt-6">- Sandra</p>
            </div>
          </div>
        </section>

        {/* SCENE 9: FOOTER */}
        <section
          ref={(el) => (scenesRef.current[8] = el)}
          className="scene bg-black text-white/60 relative h-auto min-h-[50dvh] py-16"
        >
          <div className="container mx-auto px-6 max-w-4xl h-full flex flex-col justify-center">
            <div className="text-center mb-12 fade-up">
              <h2 className="hero-title mb-6" style={{ fontSize: "36px", fontFamily: "'Times New Roman', serif", color: "#fafaf9" }}>
                You don't need perfect photos. You just need to show up.
              </h2>
              <a
                href="#membership"
                onClick={(e) => {
                  e.preventDefault()
                  trackCTAClick("closing", "Join the Studio Today", "#membership")
                  scrollToPricing()
                }}
                className="btn"
              >
                Join the Studio Today →
              </a>
            </div>
            <div className="grid gap-8 mb-12 border-b border-white/10 pb-12">
              <div>
                <h4 className="text-white font-serif text-lg mb-4">Common Questions</h4>
                <div className="space-y-4 text-xs font-light leading-relaxed">
                  <div>
                    <p className="text-white mb-1">Is it secure?</p>
                    <p>Yes, we use Stripe for payments and never see your card details.</p>
                  </div>
                  <div>
                    <p className="text-white mb-1">Can I cancel?</p>
                    <p>Yes, cancel anytime with one click.</p>
                  </div>
                  <div>
                    <p className="text-white mb-1">Are the photos mine?</p>
                    <p>Yes, you own everything you create.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 text-[10px] tracking-wider uppercase opacity-60">
              <div className="font-serif text-lg text-white normal-case tracking-normal mb-2">SSELFIE</div>
              <div className="flex gap-6">
                <Link href="/terms" className="hover:text-white transition">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy
                </Link>
              </div>
              <div className="mt-2">&copy; 2025 SSELFIE Studio</div>
            </div>
          </div>
        </section>
      </main>

      {/* Navigation Dots */}
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 z-100 flex flex-col gap-2.5"
        style={{ zIndex: 100 }}
      >
        {Array.from({ length: totalScenes }).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToScene(index)}
            className="w-1 h-1 rounded-full transition-all"
            style={{
              background: "white",
              opacity: activeScene === index ? 1 : 0.3,
              transform: activeScene === index ? "scale(1.5)" : "scale(1)",
            }}
            aria-label={`Go to scene ${index + 1}`}
          />
        ))}
      </div>

      {/* Sticky Footer */}
      {showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black text-white py-4 sm:py-5 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="text-center sm:text-left">
              <p className="text-lg sm:text-xl font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase" style={{ fontFamily: "'Times New Roman', serif" }}>
                Join SSELFIE
              </p>
              <p className="text-xs sm:text-sm font-light text-stone-400">Professional brand photos every month</p>
            </div>
            <button
              onClick={scrollToPricing}
              className="bg-white text-black px-8 sm:px-10 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px] flex items-center"
            >
              See Pricing
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .snap-container {
          scroll-snap-type: y mandatory;
          overflow-y: scroll;
          height: 100vh;
          height: 100dvh;
          scroll-behavior: smooth;
        }
        .scene {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100vw;
          position: relative;
          scroll-snap-align: start;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .scene-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
        }
        @media (min-width: 768px) {
          .scene-bg {
            background-attachment: fixed;
          }
        }
        .content {
          position: relative;
          z-index: 10;
          margin-top: auto;
          padding: 24px 20px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
          width: 100%;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        @media (min-width: 768px) {
          .content {
            padding: 64px;
            max-width: 800px;
            justify-content: center;
          }
        }
        .label {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 12px;
          display: block;
        }
        .hero-title {
          font-size: clamp(32px, 8vw, 48px);
          color: #fafaf9;
          margin-bottom: 16px;
          font-family: 'Times New Roman', serif;
          font-weight: 400;
          font-style: italic;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        @media (min-width: 768px) {
          .hero-title {
            font-size: 72px;
            margin-bottom: 24px;
          }
        }
        .description {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 15px;
          line-height: 1.5;
          font-weight: 300;
          color: rgba(250, 250, 249, 0.9);
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .description {
            font-size: 18px;
            margin-bottom: 40px;
          }
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 16px 32px;
          min-height: 48px;
          background: #fafaf9;
          color: #0c0a09;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 100px;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid #fafaf9;
          width: fit-content;
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
            padding: 20px 40px;
            font-size: 12px;
          }
        }
        .pricing-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 24px;
          margin-bottom: 12px;
          border-radius: 16px;
        }
        @media (min-width: 768px) {
          .pricing-card {
            padding: 32px;
            margin-bottom: 16px;
          }
        }
        .split-scene {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        @media (min-width: 768px) {
          .split-scene {
            flex-direction: row;
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

