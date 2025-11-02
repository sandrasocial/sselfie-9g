"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

const FEATURES = [
  {
    id: "maya",
    title: "YOUR PERSONAL PHOTO STUDIO",
    subtitle: "Never worry about content again",
    description:
      "Create professional photos that look like you, whenever you need them. No photographer, no studio, no expensive equipment. Just you, your selfies, and Maya's AI magic.",
    image: "https://i.postimg.cc/fTtCnzZv/out-1-22.png",
    color: "from-stone-900 to-stone-700",
  },
  {
    id: "brand",
    title: "YOUR BRAND DNA",
    subtitle: "Define what makes you, YOU",
    description:
      "Maya learns your unique style, voice, and vibe. Answer a few questions about your brand, and she'll create photos that actually feel like you - not some generic AI template.",
    mockupType: "brand-profile",
    color: "from-stone-800 to-stone-600",
  },
  {
    id: "academy",
    title: "LEARN THE SSELFIE METHOD",
    subtitle: "The same strategy Sandra used",
    description:
      "Personal branding, content strategy, and the 80/20 rule. Learn how to build your brand from nothing, just like Sandra did. Real strategies, not fluff.",
    mockupType: "academy",
    color: "from-stone-700 to-stone-500",
  },
  {
    id: "feed",
    title: "DESIGN YOUR FEED",
    subtitle: "See before you post",
    description:
      "Create that cohesive, professional look that makes people stop scrolling. Plan your Instagram feed, see how photos work together, and post with confidence.",
    mockupType: "feed-designer",
    color: "from-stone-600 to-stone-400",
  },
  {
    id: "strategy",
    title: "MAYA, YOUR STRATEGIST",
    subtitle: "Like having a brand manager in your pocket",
    description:
      "Get personalized photo ideas, captions, and strategy advice. Maya knows your brand, your audience, and your goals. She's not just generating photos - she's building your empire.",
    mockupType: "maya-chat",
    color: "from-stone-500 to-stone-300",
  },
]

export default function InteractiveFeaturesShowcase() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const feature = FEATURES[activeFeature]

  return (
    <div className="space-y-8 sm:space-y-12 overflow-x-hidden">
      {/* Feature Display */}
      <div className="relative bg-stone-950 rounded-2xl sm:rounded-3xl overflow-hidden min-h-[600px] sm:min-h-[700px] md:min-h-[600px] max-w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={feature.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-br ${feature.color}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />

            <div className="relative h-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 p-4 sm:p-6 md:p-16 overflow-y-auto">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex flex-col justify-center space-y-4 sm:space-y-6 text-white"
              >
                <div>
                  <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white/60 mb-2 sm:mb-3">
                    {feature.subtitle}
                  </p>
                  <h3
                    className="text-xl sm:text-3xl md:text-5xl font-extralight tracking-[0.1em] sm:tracking-[0.15em] uppercase leading-tight mb-4 sm:mb-6"
                    style={{ fontFamily: "'Times New Roman', serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg font-light leading-relaxed text-white/90">
                    {feature.description}
                  </p>
                </div>

                <div className="flex gap-1.5 sm:gap-2">
                  {FEATURES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveFeature(index)
                        setIsAutoPlaying(false)
                      }}
                      className="group relative h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
                    >
                      {index === activeFeature && isAutoPlaying && (
                        <motion.div
                          className="absolute inset-0 bg-white"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 5, ease: "linear" }}
                        />
                      )}
                      {index === activeFeature && !isAutoPlaying && <div className="absolute inset-0 bg-white" />}
                      {index < activeFeature && <div className="absolute inset-0 bg-white" />}
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex items-center justify-center flex-shrink-0"
              >
                {feature.mockupType === "maya-chat" && <MayaChatMockup />}
                {feature.mockupType === "brand-profile" && <BrandProfileMockup />}
                {feature.mockupType === "academy" && <AcademyMockup />}
                {feature.mockupType === "feed-designer" && <FeedDesignerMockup />}
                {feature.image && (
                  <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                    <Image
                      src={feature.image || "/placeholder.svg"}
                      fill
                      alt={feature.title}
                      className="object-cover"
                    />
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feature Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {FEATURES.map((feat, index) => (
          <button
            key={feat.id}
            onClick={() => {
              setActiveFeature(index)
              setIsAutoPlaying(false)
            }}
            className={`p-3 sm:p-4 rounded-xl border transition-all text-left min-h-[80px] sm:min-h-auto ${
              activeFeature === index
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-200 bg-stone-50 hover:border-stone-400"
            }`}
          >
            <p
              className={`text-[10px] sm:text-xs font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 ${
                activeFeature === index ? "text-white/60" : "text-stone-500"
              }`}
            >
              {feat.subtitle}
            </p>
            <p
              className={`text-xs sm:text-sm font-medium tracking-wider uppercase ${
                activeFeature === index ? "text-white" : "text-stone-950"
              }`}
            >
              {feat.title.split(" ").slice(0, 2).join(" ")}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// Mockup Components
function MayaChatMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-stone-950 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white overflow-hidden">
          <Image
            src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
            width={40}
            height={40}
            alt="Maya"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Maya</p>
          <p className="text-xs text-white/60">Your AI Strategist</p>
        </div>
      </div>
      <div className="p-4 space-y-3 bg-stone-50 h-48 overflow-hidden">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-950 flex-shrink-0" />
          <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
            <p className="text-sm font-light text-stone-800">
              I've analyzed your brand profile. Let's create some photos for your upcoming launch! 📸
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-950 flex-shrink-0" />
          <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 max-w-[80%]">
            <p className="text-sm font-light text-stone-800">
              How about a professional headshot in your signature beige aesthetic?
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <div className="bg-stone-950 text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
            <p className="text-sm font-light">Perfect! Let's do it ✨</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BrandProfileMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-stone-950 p-6 text-white">
        <p className="text-xs font-light tracking-[0.3em] uppercase text-white/60 mb-2">YOUR BRAND DNA</p>
        <h4
          className="text-2xl font-extralight tracking-[0.15em] uppercase"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          BRAND PROFILE
        </h4>
      </div>
      <div className="p-6 space-y-4 bg-stone-50">
        <div className="space-y-2">
          <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-500">COLOR AESTHETIC</p>
          <div className="flex gap-2">
            {["#F5F1E8", "#E8DCC8", "#D4C4A8", "#B8A88A"].map((color, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-full border-2 border-stone-200"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-500">VISUAL STYLE</p>
          <div className="flex flex-wrap gap-2">
            {["Minimalist", "Elegant", "Natural"].map((style) => (
              <div key={style} className="px-3 py-1.5 bg-stone-950 text-white rounded-full text-xs">
                {style}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-light tracking-[0.2em] uppercase text-stone-500">BRAND VOICE</p>
          <p className="text-sm font-light text-stone-700">Warm & Conversational, Inspirational</p>
        </div>
      </div>
    </div>
  )
}

function AcademyMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-stone-950 p-6 text-white">
        <p className="text-xs font-light tracking-[0.3em] uppercase text-white/60 mb-2">CONTENT ACADEMY</p>
        <h4
          className="text-2xl font-extralight tracking-[0.15em] uppercase"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          YOUR COURSES
        </h4>
      </div>
      <div className="p-4 space-y-3 bg-stone-50">
        {[
          { title: "Personal Branding 101", progress: 75 },
          { title: "The 80/20 Content Rule", progress: 45 },
          { title: "Instagram Feed Strategy", progress: 20 },
        ].map((course, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-stone-200">
            <p className="text-sm font-medium text-stone-950 mb-2">{course.title}</p>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-stone-950 rounded-full" style={{ width: `${course.progress}%` }} />
            </div>
            <p className="text-xs text-stone-500 mt-1">{course.progress}% complete</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeedDesignerMockup() {
  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-stone-950 p-6 text-white">
        <p className="text-xs font-light tracking-[0.3em] uppercase text-white/60 mb-2">FEED DESIGNER</p>
        <h4
          className="text-2xl font-extralight tracking-[0.15em] uppercase"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          YOUR FEED
        </h4>
      </div>
      <div className="p-4 bg-stone-50">
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gradient-to-br from-stone-200 to-stone-300 rounded-lg" />
          ))}
        </div>
        <p className="text-xs text-center text-stone-500 mt-4">Preview your Instagram feed before posting</p>
      </div>
    </div>
  )
}
