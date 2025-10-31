"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import Link from "next/link"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [betaCount, setBetaCount] = useState(23) // Mock beta user count

  const { scrollYProgress } = useScroll()
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const pricingRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.3em] uppercase">
            SSELFIE
          </Link>
          <div className="flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-light tracking-wider uppercase text-stone-700 hover:text-stone-950 transition-colors"
            >
              FEATURES
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-light tracking-wider uppercase text-stone-700 hover:text-stone-950 transition-colors"
            >
              PRICING
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-light tracking-wider uppercase text-stone-700 hover:text-stone-950 transition-colors"
            >
              LOGIN
            </Link>
            <Link
              href="/auth/sign-up"
              className="bg-stone-950 text-stone-50 px-6 py-2 text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
            >
              START BETA
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-6 pt-24"
      >
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block mb-6 px-4 py-2 bg-stone-950 text-stone-50">
              <p className="text-xs font-light tracking-[0.3em] uppercase">
                BETA LAUNCH • {100 - betaCount} SPOTS LEFT
              </p>
            </div>

            <h1 className="font-['Times_New_Roman'] text-6xl md:text-8xl lg:text-9xl font-extralight tracking-[0.4em] uppercase mb-8 text-stone-950">
              YOUR AI
              <br />
              PHOTO STUDIO
            </h1>

            <p className="text-lg md:text-xl font-light leading-relaxed text-stone-700 max-w-2xl mx-auto mb-12">
              Professional brand photography powered by AI. Train your personal model, generate unlimited photos, and
              build your visual brand—all guided by Maya, your AI creative director.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/auth/sign-up"
                className="bg-stone-950 text-stone-50 px-12 py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                CLAIM 50% OFF
              </Link>
              <button className="border border-stone-300 text-stone-950 px-12 py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200">
                WATCH DEMO
              </button>
            </div>

            <p className="text-xs font-light tracking-wider uppercase text-stone-500">
              BETA PRICING: $24.50/MONTH • FIRST 100 USERS ONLY
            </p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <div className="w-px h-16 bg-stone-300" />
        </motion.div>
      </motion.section>

      {/* Interactive Features Section */}
      <section ref={featuresRef} id="features" className="py-32 px-6 bg-stone-100">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-lg font-light text-stone-600 max-w-2xl mx-auto">
              From training your AI model to generating professional photos and building your content strategy
            </p>
          </motion.div>

          {/* Feature 1: Maya AI */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">FEATURE 01</div>
              <h3 className="font-['Times_New_Roman'] text-3xl md:text-5xl font-extralight tracking-[0.2em] uppercase mb-6 text-stone-950">
                MEET MAYA
              </h3>
              <p className="text-base font-light leading-relaxed text-stone-700 mb-6">
                Your AI creative director who learns your brand, understands your style, and guides you through every
                step—from training your model to creating the perfect photo concepts.
              </p>
              <ul className="space-y-3">
                {[
                  "Personalized brand guidance",
                  "Smart photo concepts",
                  "Content strategy advice",
                  "Real-time feedback",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-stone-50 p-8 rounded-lg border border-stone-200"
            >
              {/* Maya Chat Preview */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center text-stone-50 text-xs">
                    M
                  </div>
                  <div className="flex-1 bg-stone-100 p-4 rounded-lg">
                    <p className="text-sm font-light text-stone-800">
                      Hi! I'm Maya, your AI creative director. Let's create something amazing together! What kind of
                      photos do you need today?
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-stone-950 text-stone-50 p-4 rounded-lg max-w-xs">
                    <p className="text-sm font-light">I need professional headshots for my coaching business</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center text-stone-50 text-xs">
                    M
                  </div>
                  <div className="flex-1 bg-stone-100 p-4 rounded-lg">
                    <p className="text-sm font-light text-stone-800">
                      Perfect! Based on your brand profile, I'm thinking clean, professional shots with natural
                      lighting. Let me generate some concepts for you...
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature 2: AI Photo Generation */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="order-2 md:order-1"
            >
              <div className="bg-stone-50 p-8 rounded-lg border border-stone-200">
                <div className="aspect-square bg-stone-200 rounded-lg mb-4 flex items-center justify-center">
                  <p className="text-sm font-light tracking-wider uppercase text-stone-500">PHOTO PREVIEW</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square bg-stone-200 rounded" />
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="order-1 md:order-2"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">FEATURE 02</div>
              <h3 className="font-['Times_New_Roman'] text-3xl md:text-5xl font-extralight tracking-[0.2em] uppercase mb-6 text-stone-950">
                UNLIMITED PHOTOS
              </h3>
              <p className="text-base font-light leading-relaxed text-stone-700 mb-6">
                Generate professional photos in any style, setting, or outfit. Your AI model learns your unique features
                and creates photos that look authentically you.
              </p>
              <ul className="space-y-3">
                {[
                  "Train once, generate forever",
                  "Any style or setting",
                  "Professional quality",
                  "Instant results",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Feature 3: Academy */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">FEATURE 03</div>
              <h3 className="font-['Times_New_Roman'] text-3xl md:text-5xl font-extralight tracking-[0.2em] uppercase mb-6 text-stone-950">
                LEARN & GROW
              </h3>
              <p className="text-base font-light leading-relaxed text-stone-700 mb-6">
                Master personal branding, content strategy, and visual storytelling with our comprehensive academy. From
                beginner to expert, we've got you covered.
              </p>
              <ul className="space-y-3">
                {["Step-by-step courses", "Brand strategy templates", "Content planning tools", "Expert guidance"].map(
                  (item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1 h-1 bg-stone-950 mt-2" />
                      <span className="text-sm font-light text-stone-700">{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={featuresInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="bg-stone-50 p-8 rounded-lg border border-stone-200"
            >
              <div className="space-y-4">
                {["Brand Foundation", "Content Strategy", "Visual Storytelling"].map((course, i) => (
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

      {/* Pricing Section */}
      <section ref={pricingRef} id="pricing" className="py-32 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={pricingInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <div className="inline-block mb-6 px-4 py-2 bg-stone-950 text-stone-50">
              <p className="text-xs font-light tracking-[0.3em] uppercase">BETA PRICING • 50% OFF</p>
            </div>
            <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 text-stone-950">
              CHOOSE YOUR PLAN
            </h2>
            <p className="text-lg font-light text-stone-600 max-w-2xl mx-auto">
              Limited beta pricing for the first 100 users. Lock in 50% off forever.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={pricingInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-stone-100 p-8 rounded-lg border border-stone-200"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">STARTER</div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-['Times_New_Roman'] text-5xl font-extralight">$24.50</span>
                  <span className="text-sm font-light text-stone-500 line-through">$49</span>
                </div>
                <p className="text-xs font-light tracking-wider uppercase text-stone-500">PER MONTH • BETA PRICING</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "100 credits/month",
                  "1 AI model training",
                  "Maya AI assistant",
                  "Basic academy access",
                  "Email support",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?plan=starter"
                className="block w-full bg-stone-950 text-stone-50 px-6 py-3 text-center text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                START BETA
              </Link>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={pricingInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-stone-950 text-stone-50 p-8 rounded-lg border-2 border-stone-950 relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-50 text-stone-950 px-4 py-1">
                <p className="text-xs font-light tracking-[0.3em] uppercase">MOST POPULAR</p>
              </div>
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-400 mb-4">PRO</div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-['Times_New_Roman'] text-5xl font-extralight">$49.50</span>
                  <span className="text-sm font-light text-stone-400 line-through">$99</span>
                </div>
                <p className="text-xs font-light tracking-wider uppercase text-stone-400">PER MONTH • BETA PRICING</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "250 credits/month",
                  "3 AI model trainings",
                  "Maya AI assistant",
                  "Full academy access",
                  "Priority support",
                  "Advanced features",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-50 mt-2" />
                    <span className="text-sm font-light text-stone-50">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?plan=pro"
                className="block w-full bg-stone-50 text-stone-950 px-6 py-3 text-center text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
              >
                START BETA
              </Link>
            </motion.div>

            {/* Elite Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={pricingInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-stone-100 p-8 rounded-lg border border-stone-200"
            >
              <div className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">ELITE</div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-['Times_New_Roman'] text-5xl font-extralight">$99.50</span>
                  <span className="text-sm font-light text-stone-500 line-through">$199</span>
                </div>
                <p className="text-xs font-light tracking-wider uppercase text-stone-500">PER MONTH • BETA PRICING</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "600 credits/month",
                  "Unlimited AI trainings",
                  "Maya AI assistant",
                  "VIP academy access",
                  "White-glove support",
                  "All features",
                  "Early access",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1 h-1 bg-stone-950 mt-2" />
                    <span className="text-sm font-light text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/sign-up?plan=elite"
                className="block w-full bg-stone-950 text-stone-50 px-6 py-3 text-center text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                START BETA
              </Link>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={pricingInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center text-sm font-light text-stone-600 mt-12"
          >
            Beta pricing locks in forever. Only {100 - betaCount} spots remaining.
          </motion.p>
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="py-32 px-6 bg-stone-950 text-stone-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-['Times_New_Roman'] text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6">
            NOT READY YET?
          </h2>
          <p className="text-lg font-light leading-relaxed text-stone-300 mb-12">
            Join the waitlist and get exclusive early access, beta updates, and a free brand photography guide.
          </p>

          <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR EMAIL"
              required
              className="flex-1 bg-transparent border border-stone-700 px-6 py-4 text-sm font-light tracking-wider uppercase placeholder:text-stone-600 focus:outline-none focus:border-stone-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-stone-50 text-stone-950 px-8 py-4 text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? "JOINING..." : "JOIN WAITLIST"}
            </button>
          </form>
        </div>
      </section>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 bg-stone-950 text-stone-50 py-6 px-6 border-t border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.3em] uppercase">
              SSELFIE
            </Link>
            <p className="text-xs font-light tracking-wider uppercase text-stone-400">
              {100 - betaCount} BETA SPOTS LEFT
            </p>
          </div>
          <div className="flex items-center gap-6">
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
              className="bg-stone-50 text-stone-950 px-6 py-2 text-xs font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
            >
              CLAIM 50% OFF
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
