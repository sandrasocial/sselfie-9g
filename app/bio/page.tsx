'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Heart, GraduationCap, Instagram } from 'lucide-react'
import { useScroll, useTransform, motion } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'

export default function BioPage() {
  const heroContainer = useRef<HTMLDivElement>(null)
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

  const handleScrollToPricing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    handleLinkClick('bio_cta_photoshoot', '/#pricing')
    window.location.href = '/#pricing'
  }

  const handleStudioClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    handleLinkClick('bio_cta_studio', '/#pricing')
    window.location.href = '/#pricing'
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Full-Bleed Hero Section */}
      <section ref={heroContainer} className="h-screen overflow-hidden bg-white relative">
        <motion.div style={{ y }} className="relative h-full">
          <Image
            src="/images/bio-hero.png"
            fill
            alt="Sandra, founder of SSELFIE"
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            priority
            quality={90}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end z-10 pb-12 sm:pb-16 md:pb-24 px-6 sm:px-8">
            <div className="text-center text-white max-w-2xl mx-auto w-full">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 leading-tight"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                Hi, I'm Sandra
              </h1>
              
              <p className="text-lg sm:text-xl font-light leading-relaxed mb-8 max-w-md mx-auto text-white/90">
                Built from selfies. Built from nothing.
                <br />
                <br />
                Now I help you do the same.
              </p>

              <a
                href="#options"
                onClick={scrollToOptions}
                className="inline-block px-8 py-3.5 bg-white text-black text-sm uppercase tracking-wider transition-all duration-300 hover:bg-black hover:text-white border border-white font-light"
              >
                SEE WHAT I CAN DO FOR YOU
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Options Section */}
      <section id="options" className="py-16 sm:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Section Headline */}
          <h2 className="text-xs uppercase tracking-wider text-stone-500 text-center mb-8">
            CHOOSE YOUR PATH
          </h2>

          {/* Primary CTAs */}
          <div className="space-y-4 mb-16 max-w-lg mx-auto">
            {/* Button 1: Photoshoot */}
            <a
              href="/#pricing"
              onClick={handleScrollToPricing}
              className="flex items-center justify-center w-full bg-stone-950 text-white py-4 px-6 rounded-lg hover:bg-stone-800 transition-colors min-h-[48px]"
            >
              <span className="text-sm md:text-base font-medium">Professional Instagram Photos - $49</span>
            </a>

            {/* Button 2: Studio - MOST POPULAR */}
            <a
              href="/#pricing"
              onClick={handleStudioClick}
              className="flex items-center justify-center w-full bg-stone-900 text-white py-4 px-6 rounded-lg hover:bg-stone-800 transition-colors relative min-h-[48px]"
            >
              <div className="absolute top-2 right-2 bg-stone-700 text-white text-xs px-2 py-1 rounded">
                MOST POPULAR
              </div>
              <span className="text-sm md:text-base font-medium">Content Creator Studio - $79/mo</span>
            </a>

            {/* Button 3: Blueprint */}
            <Link
              href="/blueprint"
              onClick={() => handleLinkClick('bio_cta_blueprint', '/blueprint')}
              className="flex items-center justify-center w-full bg-white border-2 border-stone-300 text-stone-900 py-4 px-6 rounded-lg hover:bg-stone-50 transition-colors min-h-[48px]"
            >
              <span className="text-sm md:text-base font-medium">Get Free Brand Blueprint</span>
            </Link>
          </div>

          {/* Secondary Links */}
          <div className="mb-16 max-w-lg mx-auto">
            <h3 className="text-xs uppercase tracking-wider text-stone-500 text-center mb-6">
              MORE WAYS TO CONNECT
            </h3>
            
            <div className="bg-white rounded-lg overflow-hidden border border-stone-200 divide-y divide-stone-200">
              <Link
                href="/"
                onClick={() => handleLinkClick('bio_link_demo', '/')}
                className="flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors"
              >
                <Play className="w-5 h-5 text-stone-600 flex-shrink-0" />
                <span className="text-base text-stone-700">Watch How It Works</span>
              </Link>

              <Link
                href="/"
                onClick={() => handleLinkClick('bio_link_story', '/')}
                className="flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors"
              >
                <Heart className="w-5 h-5 text-stone-600 flex-shrink-0" />
                <span className="text-base text-stone-700">Read My Story</span>
              </Link>

              <Link
                href="/academy"
                onClick={() => handleLinkClick('bio_link_academy', '/academy')}
                className="flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors"
              >
                <GraduationCap className="w-5 h-5 text-stone-600 flex-shrink-0" />
                <span className="text-base text-stone-700">Brand Academy</span>
              </Link>

              <a
                href="https://instagram.com/sandra.social"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleLinkClick('bio_link_instagram', 'https://instagram.com/sandra.social')}
                className="flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors"
              >
                <Instagram className="w-5 h-5 text-stone-600 flex-shrink-0" />
                <span className="text-base text-stone-700">Follow on Instagram</span>
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-4 text-sm text-stone-500">
              <Link href="/privacy" className="hover:text-stone-900 transition-colors">Privacy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-stone-900 transition-colors">Terms</Link>
              <span>|</span>
              <a href="mailto:hello@sselfie.ai" className="hover:text-stone-900 transition-colors">Contact</a>
            </div>
            
            <p className="text-xs text-stone-400">
              © 2025 SSELFIE. Built with love from Norway.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
