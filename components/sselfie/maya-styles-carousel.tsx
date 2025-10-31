"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface InstagramPost {
  id: number
  image: string
  username: string
  profileImage: string
  likes: string
  caption: string
  style: string
  styleDescription: string
}

const mayaStyles: InstagramPost[] = [
  {
    id: 1,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/maya_gf2fw93gyhrm80cs60mvzf5580_0_1757449667277-6qnfatVvFlNTh33oHl9Jo7SDYm0EAJ.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "2,847",
    caption:
      "Cozy mornings and quiet moments ☕️ Building a personal brand that feels like home. This is what authentic content looks like.",
    style: "LIFESTYLE",
    styleDescription: "Natural, relatable, and story-driven",
  },
  {
    id: 2,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/maya_p4a9qvrap9rme0cs600s77hqtc_0_1757447015420%20%281%29-uuJVAEmIyrNe7BCxQAa6vgmxqtAKq3.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "3,234",
    caption:
      "City streets and coffee runs ☕️ Casual vibes, authentic energy. This is what showing up as yourself looks like.",
    style: "CASUAL",
    styleDescription: "Relaxed, approachable, and authentic",
  },
  {
    id: 3,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/maya_br94br9ghnrma0cs5dwteys1a4_0_1757371003036-8MmkKcrBbuNlGmnIRIUwf3pKXHQWpB.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "4,192",
    caption:
      "Creating content that connects 📱✨ Behind the scenes of building a brand that feels real. Your story matters.",
    style: "CONTENT CREATOR",
    styleDescription: "Bright, engaging, and relatable",
  },
  {
    id: 4,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/380-iihCcjIPJSnT0XFvpT7urKD4bZHtyR-1SXf1PGItbWySRCTRCbq2yqLlJbx1Z.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "3,876",
    caption: "Editorial elegance meets personal brand 📸 Creating content that stands out with sophistication.",
    style: "EDITORIAL",
    styleDescription: "High-fashion, magazine-worthy aesthetic",
  },
  {
    id: 5,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/328-khAwvqnoWVviglLTlhBYZBAxep8S3m-q1CC8l1czx4GC6hN2DnZSflhgdQsYS.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "5,234",
    caption:
      "Bold moves, powerful presence 💚 When your brand demands attention. This is confidence captured perfectly.",
    style: "BOLD & POWERFUL",
    styleDescription: "Fashion-forward, striking, and confident",
  },
  {
    id: 6,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/381-NXDNst5nYcchkCfFmBCkym8MhzAXK4-M4N6upv30ytB86u5DiFe9hM9eu8LSj.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "2,943",
    caption: "Edgy energy, authentic vibes 🖤 Your brand doesn't have to fit in a box. Be bold, be you.",
    style: "EDGY & URBAN",
    styleDescription: "Cool, modern, and unapologetically bold",
  },
  {
    id: 7,
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/349-SwC8j6iDdQCL5Kc7Tiy89wOmuCVYyP-IbCV1YPPJ4Vopc0htUQQ01frIN7M3P.png",
    username: "sandra.social",
    profileImage:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png",
    likes: "6,127",
    caption: "Golden hour glamour ✨ Because your brand deserves to shine. Luxury lifestyle content done right.",
    style: "GLAMOUR",
    styleDescription: "Sophisticated, luxurious, and aspirational",
  },
]

export default function MayaStylesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % mayaStyles.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const handleDotClick = (index: number) => {
    setActiveIndex(index)
    setIsAutoPlaying(false)
  }

  return (
    <section className="py-24 md:py-32 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">MAYA'S SIGNATURE STYLES</p>
          <h2 className="font-serif text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6 leading-tight">
            ONE MAYA. ENDLESS STYLES
          </h2>
          <p className="text-base font-light leading-relaxed text-stone-700 max-w-2xl mx-auto">
            Maya understands the 80/20 rule of personal branding. See how she creates cohesive feeds with variety that
            converts.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Posts Container */}
          <div className="relative h-[600px] flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              {mayaStyles.map((post, index) => {
                const offset = index - activeIndex
                const isActive = index === activeIndex

                return (
                  <motion.div
                    key={post.id}
                    animate={{
                      scale: isActive ? 1 : 0.85,
                      opacity: Math.abs(offset) <= 1 ? 1 : 0,
                      x: offset * 320,
                      zIndex: isActive ? 10 : 0,
                    }}
                    transition={{
                      duration: 0.6,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                    className="absolute"
                    style={{
                      width: "300px",
                    }}
                  >
                    {/* Instagram Post Card */}
                    <div className="bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden">
                      {/* Instagram Header */}
                      <div className="p-3 flex items-center gap-3 border-b border-stone-100">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                          <img
                            src={post.profileImage || "/placeholder.svg"}
                            alt="Profile"
                            className="w-full h-full object-cover object-[center_35%]"
                          />
                        </div>
                        <div className="text-sm font-semibold text-stone-950">{post.username}</div>
                      </div>

                      {/* Instagram Post Image */}
                      <div className="aspect-square bg-stone-200 overflow-hidden">
                        <img
                          src={post.image || "/placeholder.svg"}
                          alt={`${post.style} style`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Instagram Actions */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                          </div>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </div>

                        <div className="text-sm font-semibold text-stone-950 mb-2">{post.likes} likes</div>

                        <div className="text-sm text-stone-950 mb-3">
                          <span className="font-semibold">{post.username}</span>{" "}
                          <span className="font-normal line-clamp-2">{post.caption}</span>
                        </div>

                        <div className="text-xs text-stone-400">2 HOURS AGO</div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Style Label */}
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mt-8"
          >
            <h3 className="font-serif text-2xl md:text-3xl font-extralight tracking-[0.2em] uppercase mb-2">
              {mayaStyles[activeIndex].style}
            </h3>
            <p className="text-sm font-light text-stone-600">{mayaStyles[activeIndex].styleDescription}</p>
          </motion.div>

          {/* Navigation Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {mayaStyles.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === activeIndex ? "w-8 h-2 bg-stone-950" : "w-2 h-2 bg-stone-300 hover:bg-stone-400"
                }`}
                aria-label={`Go to style ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
