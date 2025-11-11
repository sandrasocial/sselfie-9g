"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { scrollYProgress } = useScroll()
  const heroRef = useRef(null)
  const whyRef = useRef(null)
  const comparisonRef = useRef(null)
  const featuresRef = useRef(null)
  const pricingRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const whyInView = useInView(whyRef, { once: true })
  const comparisonInView = useInView(comparisonRef, { once: true })
  const featuresInView = useInView(featuresRef, { once: true })
  const pricingInView = useInView(pricingRef, { once: true })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: Connect to actual waitlist API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setEmail("")
    alert("You're on the list! Check your email for next steps.")
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase">
            SSELFIE
          </Link>
          <div className="flex items-center gap-4 sm:gap-8">
            <Link
              href="#pricing"
              className="text-xs sm:text-sm font-light tracking-wider uppercase text-stone-700 hover:text-stone-950 transition-colors"
            >
              PRICING
            </Link>
            <Link
              href="/auth/sign-up"
              className="bg-stone-950 text-stone-50 px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
            >
              START
            </Link>
          </div>
        </div>
      </nav>

      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-24"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left: Headline & CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left order-2 lg:order-1"
            >
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950 text-balance">
                YOUR BRAND
                <br />
                PHOTO STUDIO
              </h1>

              <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700 max-w-xl mx-auto lg:mx-0 mb-8 text-pretty">
                Get 100 professional brand photos every month. No photographer, no awkward poses—just you, looking
                confident and ready for anything.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6">
                <Link
                  href="/auth/sign-up?product=sselfie_studio_membership"
                  className="w-full sm:w-auto bg-stone-950 text-stone-50 px-8 sm:px-12 py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
                >
                  JOIN THE STUDIO
                </Link>
                <Link
                  href="/auth/sign-up?product=one_time_session"
                  className="w-full sm:w-auto border border-stone-300 text-stone-950 px-8 sm:px-12 py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
                >
                  TRY IT ONCE
                </Link>
              </div>

              <p className="text-xs font-light tracking-wider uppercase text-stone-500">
                BETA PRICING • FIRST 100 MEMBERS
              </p>
            </motion.div>

            {/* Right: Hero Images */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8033.PNG-xmqjOwoJ8buVw8VTaNJEKAn2ZSDv1M.png"
                      alt="Professional brand photo example"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8032.PNG-A9BkmHKWG8N3CUOQ5g4we0ZiMKwhkA.png"
                      alt="Professional brand photo example"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden lg:block"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <div className="w-px h-16 bg-stone-300" />
        </motion.div>
      </motion.section>

      {/* Free Selfie Guide Lead Magnet Section */}
      <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-white border-t border-b border-stone-200">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-block bg-stone-950 text-stone-50 px-4 py-1 text-xs font-light tracking-[0.3em] uppercase mb-6">
              FREE GUIDE
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950 text-balance">
              BECOME A SELFIE QUEEN
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-stone-700 mb-8 max-w-2xl mx-auto text-pretty">
              Before you commit to anything, learn how to take better selfies with what you already have. Get our free
              guide with simple tips for lighting, angles, and camera tricks that actually work.
            </p>
            <Link
              href="/freebie/selfie-guide"
              className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
            >
              GET FREE GUIDE
            </Link>
            <p className="mt-4 text-xs font-light tracking-wider uppercase text-stone-500">
              NO CREDIT CARD • INSTANT ACCESS
            </p>
          </motion.div>
        </div>
      </section>

      <section ref={whyRef} className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-stone-950 text-stone-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={whyInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase mb-6 text-balance">
              WHY THIS MATTERS
            </h2>
            <p className="text-base sm:text-lg font-light leading-relaxed text-stone-300 mb-8 max-w-2xl mx-auto text-pretty">
              Your business needs more than one-off AI headshots. You need a consistent look across Instagram, your
              website, your media kit—everywhere you show up.
            </p>
            <p className="text-base sm:text-lg font-light leading-relaxed text-stone-300 mb-8 max-w-2xl mx-auto text-pretty">
              That's what makes SSELFIE different. We're not just giving you random AI portraits. We're helping you
              build a real brand with fresh, professional photos every single month.
            </p>
            <p className="text-lg sm:text-xl font-light leading-relaxed text-stone-50 max-w-2xl mx-auto text-pretty">
              When you show up consistently, people see you as the expert you are. That's confidence. That's visibility.
              That's your future.
            </p>
          </motion.div>
        </div>
      </section>

      <section ref={comparisonRef} className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-stone-100">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={comparisonInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950 text-balance">
              NOT JUST ANOTHER
              <br />
              AI HEADSHOT TOOL
            </h2>
            <p className="text-base sm:text-lg font-light text-stone-600 max-w-2xl mx-auto text-pretty">
              Here's what makes us different from one-off AI photo apps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Generic AI Headshots */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={comparisonInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-stone-200 p-6 sm:p-8 rounded-lg"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">
                GENERIC AI HEADSHOTS
              </div>
              <div className="relative aspect-square mb-6 rounded-lg overflow-hidden bg-stone-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm font-light tracking-wider uppercase text-stone-500">ONE-OFF PORTRAITS</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "Pay once, get random portraits",
                  "No brand consistency",
                  "Limited styles and settings",
                  "Run out of content fast",
                  "No ongoing support",
                  "Just technology, no strategy",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-stone-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* SSELFIE Studio */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={comparisonInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-stone-950 text-stone-50 p-6 sm:p-8 rounded-lg border-2 border-stone-950"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-400 mb-4">SSELFIE STUDIO</div>
              <div className="relative aspect-square mb-6 rounded-lg overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/nano-banana-2025-09-07T16-04-25%202.PNG-sxsI2ljcVjAC9lCJsFZTfVuAuxydvj.png"
                  alt="SSELFIE Studio professional brand photo"
                  fill
                  className="object-cover"
                />
              </div>
              <ul className="space-y-3">
                {[
                  "100 new photos every month",
                  "Consistent brand look everywhere",
                  "Unlimited styles and settings",
                  "Never run out of content",
                  "Maya helps you every step",
                  "Build your brand over time",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full bg-stone-50 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-50">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section ref={featuresRef} id="features" className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 sm:mb-24 lg:mb-32"
          >
            <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950 text-balance">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-base sm:text-lg font-light text-stone-600 max-w-2xl mx-auto text-pretty">
              From your first photo to building a full brand strategy
            </p>
          </motion.div>

          {/* Feature 1: Maya AI */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-16 sm:mb-24 lg:mb-32">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">FEATURE 01</div>
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.2em] uppercase mb-6 text-stone-950 text-balance">
                NEVER WONDER WHAT TO POST
              </h3>
              <p className="text-base font-light leading-relaxed text-stone-700 mb-6 text-pretty">
                Maya is your AI stylist who helps you figure out what photos you need, what to wear, and how to show up
                as your best self. Think of her as your creative best friend.
              </p>
              <ul className="space-y-3">
                {[
                  "Get photo ideas for your brand",
                  "Chat about what you need",
                  "Learn what actually works",
                  "Get help anytime you're stuck",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-stone-100 p-6 sm:p-8 rounded-lg border border-stone-200"
            >
              {/* Maya Chat Preview */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center text-stone-50 text-xs flex-shrink-0">
                    M
                  </div>
                  <div className="flex-1 bg-stone-50 p-4 rounded-lg">
                    <p className="text-sm font-light text-stone-800">
                      Hey! What kind of photos do you need this week? Instagram posts? Website headshots? Let's create
                      something perfect for you.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-stone-950 text-stone-50 p-4 rounded-lg max-w-xs ml-auto">
                    <p className="text-sm font-light">I need photos for my coaching business</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center text-stone-50 text-xs flex-shrink-0">
                    M
                  </div>
                  <div className="flex-1 bg-stone-50 p-4 rounded-lg">
                    <p className="text-sm font-light text-stone-800">
                      Perfect! Let's do professional but approachable. Natural lighting, confident poses. I'll create
                      some concepts for you...
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature 2: AI Photo Generation */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-16 sm:mb-24 lg:mb-32">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="order-2 lg:order-1"
            >
              <div className="bg-stone-100 p-6 sm:p-8 rounded-lg border border-stone-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8033.PNG-xmqjOwoJ8buVw8VTaNJEKAn2ZSDv1M.png"
                      alt="Professional brand photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8032.PNG-A9BkmHKWG8N3CUOQ5g4we0ZiMKwhkA.png"
                      alt="Professional brand photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="order-1 lg:order-2"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">FEATURE 02</div>
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.2em] uppercase mb-6 text-stone-950 text-balance">
                ALWAYS HAVE THE PERFECT PHOTO
              </h3>
              <p className="text-base font-light leading-relaxed text-stone-700 mb-6 text-pretty">
                Create professional photos in any style or setting. Business meeting? Casual coffee shop? Fancy event?
                You'll have photos ready for every moment.
              </p>
              <ul className="space-y-3">
                {[
                  "Train once, create forever",
                  "Any outfit, any location",
                  "Looks just like you",
                  "Download and use anywhere",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Feature 3: Academy */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">FEATURE 03</div>
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.2em] uppercase mb-6 text-stone-950 text-balance">
                BUILD A BRAND THAT ATTRACTS CLIENTS
              </h3>
              <p className="text-base font-light leading-relaxed text-stone-700 mb-6 text-pretty">
                Learn how to use your photos to build a real brand. We'll show you what works, what doesn't, and how to
                show up in a way that makes people want to work with you.
              </p>
              <ul className="space-y-3">
                {[
                  "Easy-to-follow courses",
                  "Templates you can actually use",
                  "Plan your content in minutes",
                  "Learn from real examples",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="bg-stone-100 p-6 sm:p-8 rounded-lg border border-stone-200"
            >
              <div className="space-y-4">
                {["Your Brand Foundation", "Content That Converts", "Show Up With Confidence"].map((course, i) => (
                  <div key={i} className="border-b border-stone-200 pb-4 last:border-0">
                    <h4 className="text-sm font-medium tracking-wider uppercase mb-2">{course}</h4>
                    <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                      <div className="bg-stone-950 h-full" style={{ width: `${(i + 1) * 30}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section ref={pricingRef} id="pricing" className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-stone-100">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 sm:mb-24"
          >
            <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950 text-balance">
              SIMPLE PRICING
            </h2>
            <p className="text-base sm:text-lg font-light text-stone-600 max-w-2xl mx-auto text-pretty">
              Try it once, or join the studio for fresh photos every month.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="bg-stone-950 text-stone-50 p-4 sm:p-6 rounded-lg text-center mb-8 sm:mb-12 max-w-3xl mx-auto"
          >
            <p className="text-xs sm:text-sm font-light tracking-[0.3em] uppercase mb-2 text-stone-300">
              BETA PRICING FOR FIRST 100
            </p>
            <p className="text-sm sm:text-base font-light leading-relaxed">
              Lock in this pricing forever. Limited spots available.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-12 sm:mb-16">
            {/* One-Time Session */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={pricingInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-stone-50 p-6 sm:p-8 rounded-lg border border-stone-200"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">ONE-TIME</div>
              <h3 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase mb-4 text-stone-950">
                TRY IT ONCE
              </h3>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl sm:text-2xl font-light text-stone-400 line-through">$99</span>
                  <span className="font-serif text-4xl sm:text-5xl font-extralight">$49</span>
                </div>
                <p className="text-xs font-light tracking-wider uppercase text-stone-500">ONE-TIME • 50% OFF BETA</p>
              </div>
              <p className="text-sm font-light leading-relaxed text-stone-700 mb-6 text-pretty">
                Not ready to commit? Try one AI photoshoot first. No subscription, just see if you like it.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "One AI model training",
                  "Create up to 50 photos",
                  "All styles and settings",
                  "Download high-res images",
                  "Valid for 30 days",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?product=one_time_session"
                className="block w-full bg-stone-950 text-stone-50 px-6 py-3 text-center text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                TRY IT ONCE
              </Link>
            </motion.div>

            {/* Studio Membership */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={pricingInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-stone-950 text-stone-50 p-6 sm:p-8 rounded-lg border-2 border-stone-950 relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-50 text-stone-950 px-4 py-1">
                <p className="text-xs font-light tracking-[0.3em] uppercase">MOST POPULAR</p>
              </div>
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-400 mb-4">MEMBERSHIP</div>
              <h3 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase mb-4">
                STUDIO ACCESS
              </h3>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl sm:text-2xl font-light text-stone-400 line-through">$199</span>
                  <span className="font-serif text-4xl sm:text-5xl font-extralight">$99</span>
                  <span className="text-sm font-light text-stone-400">/month</span>
                </div>
                <p className="text-xs font-light tracking-wider uppercase text-stone-400">
                  CANCEL ANYTIME • 50% OFF BETA
                </p>
              </div>
              <p className="text-sm font-light leading-relaxed text-stone-50 mb-6 text-pretty">
                Get 100 fresh professional photos every single month. Never run out of content. Build your brand over
                time.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "100 new photos every month",
                  "Unlimited AI model updates",
                  "Full Maya AI access",
                  "All Academy courses",
                  "Monthly brand content drops",
                  "Feed planning tools",
                  "Priority support",
                  "Early access to new features",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-50 mt-2 flex-shrink-0" />
                    <span className="text-sm font-light text-stone-50">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?product=sselfie_studio_membership"
                className="block w-full bg-stone-50 text-stone-950 px-6 sm:px-8 py-3 sm:py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
              >
                JOIN THE STUDIO
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={pricingInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center"
          >
            <p className="text-sm font-light text-stone-600 mb-4">
              Need more credits? Top up anytime from your dashboard.
            </p>
            <Link
              href="/auth/login"
              className="inline-block text-sm font-light tracking-wider uppercase text-stone-700 hover:text-stone-950 transition-colors underline underline-offset-4"
            >
              VIEW CREDIT PACKAGES
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-stone-950 text-stone-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-balance">
            NOT READY YET?
          </h2>
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-300 mb-8 sm:mb-12 text-pretty">
            Join the waitlist and get exclusive early access, updates, and a free brand photography guide.
          </p>

          <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR EMAIL"
              required
              className="flex-1 bg-transparent border border-stone-700 px-4 sm:px-6 py-3 sm:py-4 text-sm font-light tracking-wider uppercase placeholder:text-stone-600 focus:outline-none focus:border-stone-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-stone-50 text-stone-950 px-6 sm:px-8 py-3 sm:py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? "JOINING..." : "JOIN WAITLIST"}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-50 py-6 px-4 sm:px-6 border-t border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="font-serif text-lg sm:text-xl font-extralight tracking-[0.3em] uppercase">
              SSELFIE
            </Link>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/privacy"
              className="text-xs font-light tracking-wider uppercase text-stone-400 hover:text-stone-50 transition-colors"
            >
              PRIVACY
            </Link>
            <Link
              href="/terms"
              className="text-xs font-light tracking-wider uppercase text-stone-400 hover:text-stone-50 transition-colors"
            >
              TERMS
            </Link>
            <Link
              href="/auth/sign-up"
              className="bg-stone-50 text-stone-950 px-4 sm:px-6 py-2 text-xs font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
            >
              GET STARTED
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
