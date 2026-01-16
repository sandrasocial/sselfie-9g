"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { trackCTAClick, trackPricingView, trackCheckoutStart } from "@/lib/analytics"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import TestimonialGrid from "@/components/testimonials/testimonial-grid"

export default function WhyStudioPage() {
  const [activeScene, setActiveScene] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scenesRef = useRef<(HTMLDivElement | null)[]>([])

  const totalScenes = 9

  // Track pricing section view
  useEffect(() => {
    const pricingSection = document.getElementById("pricing")
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
    const pricingSection = document.getElementById("pricing")
    if (pricingSection && containerRef.current) {
      const sceneIndex = 6 // Pricing is scene 7 (0-indexed = 6)
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
              The Visibility Studio
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
              Stop hiding. Start showing up beautifully.
            </h1>
            <p className="description fade-up mx-auto max-w-sm" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}>
              SSELFIE Studio helps you create your own brand photos, plan your social feed, and stay visible, all in one simple system.
            </p>
            <div className="fade-up" style={{ transitionDelay: "0.2s", marginTop: "10px" }}>
              <a
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault()
                  trackCTAClick("hero", "Join The Visibility Studio", "#pricing")
                  scrollToPricing()
                }}
                className="btn shadow-xl"
              >
                Join The Visibility Studio →
              </a>
            </div>
            <p className="description fade-up mx-auto max-w-sm mt-4" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)", fontSize: "14px", marginTop: "16px" }}>
              No photographers. No stress. No more overthinking what to post.
            </p>
          </div>
        </section>

        {/* SCENE 2: QUOTE */}
        <section
          ref={(el) => (scenesRef.current[1] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#0c0a09",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="content text-center h-full justify-center">
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "32px",
                marginBottom: "24px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: "normal",
                fontStyle: "normal",
              }}
            >
              Visibility changes everything.
            </h2>
            <blockquote
              className="hero-title fade-up"
              style={{
                fontSize: "32px",
                marginBottom: "24px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: "normal",
                fontStyle: "italic",
              }}
            >
              &quot;I used to hide behind my logo. Now I&apos;m the face of my brand, and it&apos;s changed everything.&quot;
            </blockquote>
            <p className="label fade-up" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
              — Sarah, Studio Member
            </p>
          </div>
        </section>

        {/* SCENE 3: WHY STUDIO */}
        <section
          ref={(el) => (scenesRef.current[2] = el)}
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
            <div
              className="w-full md:w-1/2 flex flex-col justify-center fade-in-up md:p-16"
              style={{
                padding: "24px",
              }}
            >
              <span className="label fade-up">Why Studio</span>
              <h2
                className="hero-title fade-up"
                style={{
                  fontSize: "32px",
                  marginBottom: "12px",
                  fontFamily: "'Times New Roman', serif",
                  fontWeight: "normal",
                }}
              >
                You don&apos;t need another AI app. You need a visibility system.
              </h2>
              <p className="description fade-up text-sm md:text-base" style={{ color: "#d6d3d1" }}>
                Most people struggle to stay consistent online. SSELFIE Studio makes it easy to keep showing up with confidence.
              </p>
              <div className="fade-up mt-6">
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault()
                    trackCTAClick("why-studio", "Join now", "#pricing")
                    scrollToPricing()
                  }}
                  className="btn"
                >
                  Join now →
                </a>
              </div>
            </div>
            <div
              className="w-full md:w-1/2 relative fade-in-up md:h-[600px]"
              style={{
                height: "400px",
              }}
            >
              <img
                src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png"
                className="w-full h-full object-cover rounded-lg"
                alt="Visibility System"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* SCENE 4: FEATURES */}
        <section
          ref={(el) => (scenesRef.current[3] = el)}
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
            {/* Feature 1 */}
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
                  alt="Brand Photos"
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
                  Brand photos
                </h3>
                <p className="text-stone-300 text-xs md:text-sm max-w-xs font-light leading-relaxed mb-4">
                  Brand photos that actually look like you, no filters or weird edits.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
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
                  alt="Feed Planner"
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
                  Feed Planner
                </h3>
                <p className="text-stone-300 text-xs md:text-sm max-w-xs font-light leading-relaxed mb-4">
                  Feed Planner to design your Instagram grid and keep it consistent.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black border border-white/20 px-4 py-1.5 rounded-full shadow-xl">
            <span className="text-[9px] uppercase tracking-widest text-white whitespace-nowrap">Everything you need to stay visible</span>
          </div>
        </section>

        {/* SCENE 5: MORE FEATURES */}
        <section
          ref={(el) => (scenesRef.current[4] = el)}
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
            {/* Feature 3 */}
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
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/tmpbmq4nfg7.png"
                  alt="Learning Hub"
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
                  Learning Hub
                </h3>
                <p className="text-stone-300 text-xs md:text-sm max-w-xs font-light leading-relaxed mb-4">
                  Learning Hub with bite-sized lessons to grow your visibility.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
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
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/xjn21cxbtdrmt0cvdxpsx38cnw-Z4oXOAZDQKa9g4KGDjiEYtRGQl5moM.png"
                  alt="Monthly Ideas"
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
                  Monthly Ideas
                </h3>
                <p className="text-stone-300 text-xs md:text-sm max-w-xs font-light leading-relaxed mb-4">
                  Monthly content ideas and style drops to keep things fresh.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 6: COMPARISON */}
        <section
          ref={(el) => (scenesRef.current[5] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#1c1917",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="content h-full justify-center">
            <span className="label fade-up text-center w-full">Choose your visibility plan</span>
            <h2 className="hero-title text-center mb-4 fade-up" style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif" }}>
              Choose your visibility plan
            </h2>
            <p className="description text-center mb-8 fade-up" style={{ color: "rgba(250, 250, 249, 0.9)" }}>
              Whether you want to try the Studio or go all in, we&apos;ve made it simple.
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
              {/* Starter Plan */}
              <div className="pricing-card fade-up relative overflow-hidden group flex-1">
                <h3 className="text-lg font-serif text-white mb-4">Starter Plan — Try your first Studio session</h3>
                <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                  <p>• 50 credits (one-time)</p>
                  <p>• Basic Maya AI assistant</p>
                  <p>• Perfect for testing</p>
                </div>
                <div className="mb-6">
                  <span className="text-xl font-serif text-white">$49</span>
                  <span className="text-[9px] uppercase text-stone-500 block">one-time</span>
                </div>
                <button
                  onClick={() => handleStartCheckout("one_time_session")}
                  disabled={checkoutLoading === "one_time_session"}
                  className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading === "one_time_session" ? "Loading..." : "Start now →"}
                </button>
              </div>

              {/* Full Membership */}
              <div className="pricing-card fade-up relative overflow-hidden group flex-1">
                <div className="absolute top-0 left-0 w-1 h-full bg-white" />
                <h3 className="text-lg font-serif text-white mb-4">Full Membership — Join the Visibility System</h3>
                <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                  <p>• 200 credits every month</p>
                  <p>• Full Maya AI assistant</p>
                  <p>• Complete Brand Academy</p>
                  <p>• Feed Designer</p>
                  <p>• Monthly strategy drops</p>
                </div>
                <div className="mb-6">
                  <span className="text-xl font-serif text-white">$97</span>
                  <span className="text-[9px] uppercase text-stone-500 block">/ month</span>
                </div>
                <button
                  onClick={() => handleStartCheckout("sselfie_studio_membership")}
                  disabled={checkoutLoading === "sselfie_studio_membership"}
                  className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading === "sselfie_studio_membership" ? "Loading..." : "Join the Studio →"}
                </button>
              </div>
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
            <span className="label fade-up text-center w-full mb-4">What members are saying</span>
            <h2 className="hero-title fade-up text-center mb-4" style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif" }}>
              What members are saying
            </h2>
            <p className="description fade-up text-center mb-6" style={{ color: "rgba(250, 250, 249, 0.9)" }}>
              Real stories from creators and coaches using SSELFIE to grow their brands.
            </p>
            <div className="w-full overflow-hidden">
              <TestimonialGrid />
            </div>
          </div>
        </section>

        {/* SCENE 8: PRICING */}
        <section
          id="pricing"
          ref={(el) => (scenesRef.current[7] = el)}
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
              <span className="label text-center w-full fade-up mt-8 md:mt-0">Join The Visibility Studio</span>
              <h2 className="hero-title text-center mb-4 fade-up" style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif" }}>
                Join The Visibility Studio
              </h2>
              <p className="description text-center mb-8 fade-up" style={{ color: "rgba(250, 250, 249, 0.9)" }}>
                One membership. All the tools you need to stay visible and confident.
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
                    <p>• Trained model that looks exactly like you</p>
                    <p>• Basic Maya AI assistant</p>
                    <p>• Perfect for testing</p>
                  </div>
                  <button
                    onClick={() => handleStartCheckout("one_time_session")}
                    disabled={checkoutLoading === "one_time_session"}
                    className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading === "one_time_session" ? "Loading..." : "Start now →"}
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
                    <p>• Monthly photo credits</p>
                    <p>• Feed planning tools</p>
                    <p>• Full Academy access</p>
                    <p>• New content ideas every month</p>
                  </div>
                  <button
                    onClick={() => handleStartCheckout("sselfie_studio_membership")}
                    disabled={checkoutLoading === "sselfie_studio_membership"}
                    className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading === "sselfie_studio_membership" ? "Loading..." : "Join the Studio →"}
                  </button>
                </div>
              </div>

              <p className="text-center text-[9px] text-stone-400 mt-2 fade-up pb-8 md:pb-0 font-light">
                Cancel anytime. 30-day refund policy.
              </p>
            </div>
          </div>
        </section>

        {/* SCENE 9: FOUNDER & CLOSING */}
        <section
          ref={(el) => (scenesRef.current[8] = el)}
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
                &quot;I built this because showing up online used to feel impossible.&quot;
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
                I was tired of hiding behind my logo and filters. I wanted something that made visibility simple, not scary. That&apos;s how SSELFIE Studio was born.
              </p>
              <p className="text-xs text-stone-400 mt-6">— Sandra</p>
              <div className="mt-8">
                <h2 className="hero-title mb-6" style={{ fontSize: "36px", fontFamily: "'Times New Roman', serif" }}>
                  You don&apos;t need perfect photos. You just need to show up.
                </h2>
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault()
                    trackCTAClick("closing", "Join The Studio Today", "#pricing")
                    scrollToPricing()
                  }}
                  className="btn"
                >
                  Join The Studio Today →
                </a>
              </div>
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
