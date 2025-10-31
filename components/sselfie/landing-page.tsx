"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useScroll, useTransform, motion } from "framer-motion"
import Image from "next/image"
import InteractivePipelineShowcase from "./interactive-pipeline-showcase"

export default function LandingPage() {
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const [mayaMessages, setMayaMessages] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
            <Link
              href="/auth/sign-up"
              className="bg-white text-black px-6 py-2.5 text-xs uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
            >
              START BETA
            </Link>
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
            <Link
              href="/auth/sign-up"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-white text-black px-8 py-3 text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
            >
              START BETA
            </Link>
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
              <Link
                href="/auth/sign-up"
                className="inline-block px-8 md:px-10 py-3 md:py-3.5 bg-white text-black text-xs md:text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white"
              >
                GET STARTED
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section ref={aboutContainer} className="relative py-32 bg-stone-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-6 md:gap-16 items-center">
            <motion.div style={{ y: aboutY }} className="relative">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/100-W8HXvEhCIG14XjVDUygpuBKAhlwZCj-WJvAoPmd0GqXTjJE1mvy77jVzJGvyA.png"
                  fill
                  alt="Sandra - Founder of SSELFIE"
                  className="object-cover"
                />
              </div>
            </motion.div>

            <div className="space-y-4 md:space-y-6">
              <div>
                <p className="text-[8px] md:text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-2 md:mb-4">
                  THE STORY
                </p>
                <h2
                  className="text-xl md:text-4xl lg:text-5xl font-light mb-3 md:mb-6 leading-tight"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Built from Nothing.
                  <br />
                  Built from Selfies.
                </h2>
              </div>

              <div className="space-y-2 md:space-y-4 text-xs md:text-base font-light leading-relaxed text-stone-700">
                <p>
                  I started as a single mom of three. Divorced, heartbroken, broke, and totally overwhelmed. I had to
                  build my whole life and business from scratch, with nothing.
                </p>
                <p>
                  I began by teaching women how to take better selfies on Instagram. Then I shared my own story. That's
                  how my "SSELFIE machine" was born.
                </p>
                <p>
                  Today, SSELFIE Studio helps women who feel stuck or invisible. Women who don't have time or money for
                  brand photoshoots but still need professional photos. I wanted them to see themselves in a new light
                  and feel confident enough to build their own personal brands.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InteractivePipelineShowcase />

      <section id="features" className="py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">MEET YOUR AI STRATEGIST</p>
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase">
              MAYA KNOWS YOUR BRAND
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-stone-50 rounded-2xl p-8 shadow-lg">
              <div className="space-y-4">
                {mayaMessages.map((message, index) => (
                  <div key={index} className="flex gap-3 animate-in fade-in slide-in-from-left duration-500">
                    <div className="w-10 h-10 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
                      <span className="text-stone-50 text-sm">M</span>
                    </div>
                    <div className="bg-stone-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                      <p className="text-sm font-light text-stone-800">{message}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
                      <span className="text-stone-50 text-sm">M</span>
                    </div>
                    <div className="bg-stone-100 rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase mb-3">
                  LEARNS YOUR STYLE
                </h3>
                <p className="text-base font-light leading-relaxed text-stone-700">
                  Maya understands your brand, voice, and aesthetic. She creates photos that match your unique style and
                  vision.
                </p>
              </div>
              <div>
                <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase mb-3">
                  STRATEGIC GUIDANCE
                </h3>
                <p className="text-base font-light leading-relaxed text-stone-700">
                  Get personalized photo concepts based on your content pillars, audience, and business goals.
                </p>
              </div>
              <div>
                <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase mb-3">
                  INSTANT GENERATION
                </h3>
                <p className="text-base font-light leading-relaxed text-stone-700">
                  Create professional photos in minutes, not days. No photographer, no studio, no expensive equipment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">EVERYTHING YOU NEED</p>
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase">
              COMPLETE PHOTO STUDIO
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AI PHOTO GENERATION",
                description:
                  "Create unlimited professional photos with AI. Choose from hundreds of styles and settings.",
              },
              {
                title: "BRAND PROFILE",
                description: "Build your personal brand profile so Maya understands your unique style and voice.",
              },
              {
                title: "CONTENT ACADEMY",
                description: "Learn photo strategy, personal branding, and content creation from industry experts.",
              },
              {
                title: "FEED DESIGNER",
                description: "Plan and visualize your Instagram feed before posting. See how photos work together.",
              },
              {
                title: "MAYA AI ASSISTANT",
                description: "Get personalized photo concepts, captions, and strategy advice from your AI strategist.",
              },
              {
                title: "BRAND ASSETS",
                description: "Upload your logo, colors, and brand elements to maintain consistency across all photos.",
              },
            ].map((feature, index) => (
              <div key={index} className="bg-stone-100 rounded-2xl p-8">
                <h3 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.2em] uppercase mb-4">
                  {feature.title}
                </h3>
                <p className="text-sm font-light leading-relaxed text-stone-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">BETA PRICING</p>
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-4">
              50% OFF FOR FIRST 100
            </h2>
            <p className="text-lg font-light text-stone-700">
              Lock in beta pricing forever. No credit card required to start.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
              <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-2">STARTER</p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Times_New_Roman'] text-5xl font-extralight">$24.50</span>
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
              <Link
                href="/auth/sign-up?plan=starter"
                className="block w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 text-center"
              >
                START BETA
              </Link>
            </div>

            <div className="bg-stone-950 text-stone-50 rounded-2xl p-8 border-2 border-stone-950 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-50 text-stone-950 px-4 py-1 rounded-full">
                <p className="text-xs font-light tracking-[0.3em] uppercase">MOST POPULAR</p>
              </div>
              <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-400 mb-2">PRO</p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Times_New_Roman'] text-5xl font-extralight">$49.50</span>
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
              <Link
                href="/auth/sign-up?plan=pro"
                className="block w-full bg-stone-50 text-stone-950 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 text-center"
              >
                START BETA
              </Link>
            </div>

            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200">
              <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-2">ELITE</p>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-['Times_New_Roman'] text-5xl font-extralight">$99.50</span>
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
              <Link
                href="/auth/sign-up?plan=elite"
                className="block w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 text-center"
              >
                START BETA
              </Link>
            </div>
          </div>

          <p className="text-center mt-8 text-sm font-light text-stone-600">
            Beta pricing locked in forever • Cancel anytime • No credit card required
          </p>
        </div>
      </section>

      <section className="py-32 bg-stone-50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">NOT READY YET?</p>
          <h2 className="font-['Times_New_Roman'] text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase mb-6">
            JOIN THE WAITLIST
          </h2>
          <p className="text-base font-light leading-relaxed text-stone-700 mb-8">
            Get early access updates, photo strategy tips, and exclusive beta invites.
          </p>
          <form className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="YOUR EMAIL"
              className="flex-1 px-6 py-3 bg-stone-100 border border-stone-200 rounded-lg text-sm font-light placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
            />
            <button
              type="submit"
              className="bg-stone-950 text-stone-50 px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
            >
              JOIN
            </button>
          </form>
        </div>
      </section>

      <footer className="bg-stone-100 border-t border-stone-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.3em] uppercase">
              SSELFIE
            </Link>
            <div className="flex items-center gap-8">
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
          <p className="text-center mt-8 text-xs font-light text-stone-500">© 2025 SSELFIE. All rights reserved.</p>
        </div>
      </footer>

      {showStickyFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950 text-stone-50 py-4 shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div>
              <p className="font-['Times_New_Roman'] text-lg font-extralight tracking-[0.2em] uppercase">
                READY TO START?
              </p>
              <p className="text-xs font-light text-stone-400">50% off for first 100 beta users</p>
            </div>
            <Link
              href="/auth/sign-up"
              className="bg-stone-50 text-stone-950 px-8 py-3 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
            >
              CLAIM YOUR SPOT
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
