'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Heart, GraduationCap, Instagram } from 'lucide-react'
import { useScroll, useTransform, motion } from 'framer-motion'
import { trackEvent, trackCTAClick, trackCheckoutStart } from '@/lib/analytics'
import { startEmbeddedCheckout } from '@/lib/start-embedded-checkout'

export default function BioPage() {
  const heroContainer = useRef<HTMLDivElement>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const { scrollYProgress } = useScroll({
    target: heroContainer,
    offset: ["start start", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"])

  const handleLinkClick = (linkType: string, destination: string) => {
    trackEvent('bio_link_click', {
      link_type: linkType,
      destination: destination,
      timestamp: new Date().toISOString(),
    })
  }

  const scrollToOptions = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const optionsSection = document.getElementById("options")
    if (optionsSection) {
      optionsSection.scrollIntoView({ behavior: "smooth", block: "start" })
      handleLinkClick('bio_hero_cta', '#options')
    }
  }

  const handleStartCheckout = async (productId: string) => {
    try {
      setCheckoutLoading(productId)
      
      const productNames: Record<string, string> = {
        one_time_session: "Starter Photoshoot",
        sselfie_studio_membership: "Creator Studio",
      }
      const productName = productNames[productId] || productId
      trackCheckoutStart(productId, undefined)
      trackCTAClick('bio', productName, '/checkout')
      
      const clientSecret = await startEmbeddedCheckout(productId)
      window.location.href = `/checkout?client_secret=${clientSecret}`
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Checkout error:", error)
      }
      alert("Failed to start checkout. Please try again.")
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-black">
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

      {/* Full-Bleed Hero Section */}
      <section ref={heroContainer} className="h-screen overflow-hidden bg-black relative">
        <motion.div style={{ y }} className="relative h-full">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/feed-posts/2964-Z5YG6DA4jyEAVnKwh4HNecJyCepqhz.png')",
            }}
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end z-10 pb-12 sm:pb-16 md:pb-24 px-6 sm:px-8">
            <div className="text-center text-white max-w-2xl mx-auto w-full">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 leading-tight"
                style={{ fontFamily: "'Times New Roman', serif", fontStyle: "italic" }}
              >
                Hi, I'm Sandra
              </h1>
              
              <p className="text-lg sm:text-xl font-light leading-relaxed mb-8 max-w-md mx-auto text-white/90" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
                Built from selfies. Built from nothing.
                <br />
                <br />
                Now I help you do the same.
              </p>

              <a
                href="#options"
                onClick={scrollToOptions}
                className="btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 32px",
                  minHeight: "48px",
                  background: "#fafaf9",
                  color: "#0c0a09",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderRadius: "100px",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  border: "1px solid #fafaf9",
                }}
              >
                SEE WHAT I CAN DO FOR YOU
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Options Section */}
      <section id="options" className="py-16 sm:py-20 px-6 bg-[#0c0a09]">
        <div className="max-w-2xl mx-auto">
          {/* Section Headline */}
          <h2 
            className="text-center mb-12"
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            CHOOSE YOUR PATH
          </h2>

          {/* Primary CTAs with Thumbnails */}
          <div className="space-y-6 mb-16 max-w-lg mx-auto">
            {/* Button 1: Photoshoot */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (checkoutLoading) return
                handleStartCheckout("one_time_session")
              }}
              className={`group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all ${
                checkoutLoading === "one_time_session" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div className="relative h-32 overflow-hidden">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png"
                  alt="Starter Photoshoot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: "center top" }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-serif text-white mb-1">Starter Photoshoot</h3>
                    <p className="text-xs text-white/60 uppercase tracking-wider">Try It First</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-serif text-white">$49</span>
                    <span className="text-[9px] uppercase text-white/50 block">one-time</span>
                  </div>
                </div>
              </div>
            </a>

            {/* Button 2: Studio - MOST POPULAR */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (checkoutLoading) return
                handleStartCheckout("sselfie_studio_membership")
              }}
              className={`group relative block overflow-hidden rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all ${
                checkoutLoading === "sselfie_studio_membership" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-white z-10" />
              <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[8px] uppercase tracking-widest text-white border border-white/20 z-10">
                MOST POPULAR
              </div>
              <div className="relative h-32 overflow-hidden">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png"
                  alt="Creator Studio"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: "center 25%" }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-serif text-white mb-1">Creator Studio</h3>
                    <p className="text-xs text-white/60 uppercase tracking-wider">Most Popular</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-serif text-white">$97</span>
                    <span className="text-[9px] uppercase text-white/50 block">/ month</span>
                  </div>
                </div>
              </div>
            </a>

            {/* Button 3: Blueprint */}
            <Link
              href="/blueprint"
              onClick={() => handleLinkClick('bio_cta_blueprint', '/blueprint')}
              className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
            >
              <div className="relative h-32 overflow-hidden">
                <img
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/tmpbmq4nfg7.png"
                  alt="Free Brand Blueprint"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: "center center" }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-serif text-white">Get Free Brand Blueprint</h3>
                </div>
              </div>
            </Link>
          </div>

          {/* Secondary Links */}
          <div className="mb-16 max-w-lg mx-auto">
            <h3 
              className="text-center mb-6"
              style={{
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: "10px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.8)",
              }}
            >
              MORE WAYS TO CONNECT
            </h3>
            
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Link
                href="/"
                onClick={() => handleLinkClick('bio_link_demo', '/')}
                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
              >
                <Play className="w-5 h-5 text-white/60 flex-shrink-0" />
                <span className="text-base text-white/90">Watch How It Works</span>
              </Link>

              <Link
                href="/"
                onClick={() => handleLinkClick('bio_link_story', '/')}
                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
              >
                <Heart className="w-5 h-5 text-white/60 flex-shrink-0" />
                <span className="text-base text-white/90">Read My Story</span>
              </Link>

              <Link
                href="/academy"
                onClick={() => handleLinkClick('bio_link_academy', '/academy')}
                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/10 last:border-b-0"
              >
                <GraduationCap className="w-5 h-5 text-white/60 flex-shrink-0" />
                <span className="text-base text-white/90">Brand Academy</span>
              </Link>

              <a
                href="https://instagram.com/sandra.social"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleLinkClick('bio_link_instagram', 'https://instagram.com/sandra.social')}
                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
              >
                <Instagram className="w-5 h-5 text-white/60 flex-shrink-0" />
                <span className="text-base text-white/90">Follow on Instagram</span>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-4 text-sm text-white/60">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <span>|</span>
              <a href="mailto:hello@sselfie.ai" className="hover:text-white transition-colors">Contact</a>
            </div>
            
            <p className="text-xs text-white/40" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
              © 2025 SSELFIE. Built with love from Norway.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
