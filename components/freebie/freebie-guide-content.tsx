"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Download, Sparkles, Camera, Sun, Smile, Edit3, TrendingUp, ChevronRight } from "lucide-react"
import Link from "next/link"

interface FreebieGuideContentProps {
  subscriberName: string
}

export function FreebieGuideContent({ subscriberName }: FreebieGuideContentProps) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeChapter, setActiveChapter] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight - windowHeight
      const scrolled = window.scrollY
      const progress = Math.min((scrolled / documentHeight) * 100, 100)
      setScrollProgress(progress)

      const chapterElements = document.querySelectorAll("[data-chapter]")
      chapterElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
          setActiveChapter(index)
        }
      })
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const chapters = [
    {
      number: "01",
      title: "Camera Mastery",
      icon: Camera,
      description: "Master your phone camera settings, grid lines, and timer functions for perfect shots every time.",
    },
    {
      number: "02",
      title: "Lighting Secrets",
      icon: Sun,
      description: "Discover the golden hour, window light techniques, and how to create flattering shadows.",
    },
    {
      number: "03",
      title: "Angles & Poses",
      icon: Smile,
      description:
        "Learn the most flattering angles for your face shape and body type, plus natural posing techniques.",
    },
    {
      number: "04",
      title: "Editing Like a Pro",
      icon: Edit3,
      description: "Professional editing workflows, color grading, and retouching without looking overdone.",
    },
    {
      number: "05",
      title: "Building Confidence",
      icon: Sparkles,
      description: "Overcome camera shyness, develop your signature style, and own your presence.",
    },
    {
      number: "06",
      title: "Social Strategy",
      icon: TrendingUp,
      description: "Optimize your selfies for Instagram, create cohesive feeds, and grow your audience.",
    },
  ]

  const scrollToChapter = (index: number) => {
    const element = document.querySelector(`[data-chapter="${index}"]`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Progress Bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-stone-200">
        <div className="h-full bg-black transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            <span className="font-serif text-xl font-bold">SSELFIE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-stone-600">
              Chapter {activeChapter + 1} of {chapters.length}
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href="/selfie-guide.pdf" download>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center md:py-24">
        <h1 className="mb-4 font-serif text-5xl font-bold leading-tight md:text-6xl lg:text-7xl">
          Welcome, {subscriberName}!
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-stone-600 md:text-xl">
          You're about to master the art of selfies. This comprehensive guide will transform how you see yourself and
          how the world sees you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild className="bg-black hover:bg-black/90">
            <Link href="/studio">
              Try SSELFIE Studio Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#chapters">Start Reading</a>
          </Button>
        </div>
      </section>

      {/* Chapters Navigation */}
      <section id="chapters" className="border-y border-stone-200 bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold md:text-4xl">What You'll Learn</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.number}
                onClick={() => scrollToChapter(index)}
                className="group rounded-lg border border-stone-200 bg-white p-6 text-left transition-all hover:border-black hover:shadow-lg"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 group-hover:bg-black group-hover:text-white transition-colors">
                    <chapter.icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-sm text-stone-400">{chapter.number}</span>
                </div>
                <h3 className="mb-2 font-serif text-xl font-bold flex items-center justify-between">
                  {chapter.title}
                  <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm leading-relaxed text-stone-600">{chapter.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Chapter 1: Camera Mastery */}
      <section data-chapter="0" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <span className="mb-2 inline-block font-mono text-sm text-stone-400">Chapter 01</span>
            <h2 className="mb-4 font-serif text-4xl font-bold">Camera Mastery</h2>
            <p className="text-lg leading-relaxed text-stone-600">
              Your phone camera is more powerful than you think. Let's unlock its full potential.
            </p>
          </div>

          <div className="prose prose-stone max-w-none">
            <h3>Understanding Your Camera Settings</h3>
            <p>
              Most people never explore their phone's camera settings, missing out on features that could dramatically
              improve their selfies. Here's what you need to know:
            </p>

            <ul>
              <li>
                <strong>Grid Lines:</strong> Enable the 3x3 grid to use the rule of thirds. Position your eyes along the
                top third line for the most flattering composition.
              </li>
              <li>
                <strong>Timer Function:</strong> Use a 3-10 second timer to avoid the awkward arm-extended look and
                allow yourself to settle into a natural pose.
              </li>
              <li>
                <strong>Portrait Mode:</strong> Creates beautiful background blur (bokeh) that makes you stand out.
                Adjust the depth slider for the perfect amount of blur.
              </li>
              <li>
                <strong>HDR Mode:</strong> Balances bright and dark areas in your photo. Essential for backlit
                situations or high-contrast scenes.
              </li>
            </ul>

            <div className="my-8 rounded-lg border border-stone-200 bg-stone-50 p-6">
              <h4 className="mb-2 flex items-center gap-2 font-bold">
                <Sparkles className="h-5 w-5" />
                Pro Tip
              </h4>
              <p className="mb-0">
                Clean your camera lens before every photo session. You'd be surprised how much difference a clean lens
                makes in photo clarity and sharpness.
              </p>
            </div>

            <h3>The Perfect Camera Angle</h3>
            <p>
              Camera angle is everything. Here's the golden rule: Hold your camera slightly above eye level (about 10-15
              degrees). This creates a subtle downward angle that:
            </p>
            <ul>
              <li>Makes your eyes appear larger and more expressive</li>
              <li>Defines your jawline naturally</li>
              <li>Minimizes any double chin appearance</li>
              <li>Creates a more flattering overall perspective</li>
            </ul>

            <div className="my-8 rounded-lg bg-black p-8 text-center text-white">
              <h4 className="mb-4 font-serif text-2xl font-bold">Ready to Level Up?</h4>
              <p className="mb-6">
                SSELFIE Studio uses AI to generate professional selfies with perfect lighting, angles, and composition
                every time.
              </p>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black bg-transparent"
                asChild
              >
                <Link href="/studio">
                  Try SSELFIE Studio
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 2: Lighting Secrets */}
      <section data-chapter="1" className="border-t border-stone-200 bg-stone-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <span className="mb-2 inline-block font-mono text-sm text-stone-400">Chapter 02</span>
              <h2 className="mb-4 font-serif text-4xl font-bold">Lighting Secrets</h2>
              <p className="text-lg leading-relaxed text-stone-600">
                Lighting is the difference between an amateur selfie and a professional portrait.
              </p>
            </div>

            <div className="prose prose-stone max-w-none">
              <h3>The Golden Hour Magic</h3>
              <p>
                The golden hour—the hour after sunrise and before sunset—provides the most flattering natural light. The
                sun is low on the horizon, creating:
              </p>
              <ul>
                <li>Soft, warm, diffused light that's incredibly flattering</li>
                <li>Natural glow on your skin</li>
                <li>Beautiful catchlights in your eyes</li>
                <li>Minimal harsh shadows</li>
              </ul>

              <h3>Window Light Technique</h3>
              <p>
                Can't shoot during golden hour? Window light is your best friend. Position yourself facing a large
                window with indirect sunlight:
              </p>
              <ul>
                <li>Stand 2-3 feet from the window</li>
                <li>Turn your face toward the light at a 45-degree angle</li>
                <li>Avoid direct harsh sunlight—use sheer curtains to diffuse if needed</li>
                <li>The light should illuminate one side of your face more than the other</li>
              </ul>

              <div className="my-8 rounded-lg border border-stone-200 bg-white p-6">
                <h4 className="mb-2 flex items-center gap-2 font-bold">
                  <Sun className="h-5 w-5" />
                  Lighting Mistakes to Avoid
                </h4>
                <ul className="mb-0">
                  <li>Overhead lighting (creates unflattering shadows under eyes and nose)</li>
                  <li>Direct flash (washes out your features and creates harsh shadows)</li>
                  <li>Backlighting without fill light (makes you appear as a silhouette)</li>
                  <li>Mixed color temperatures (creates unnatural skin tones)</li>
                </ul>
              </div>

              <h3>Creating Your Own Studio Lighting</h3>
              <p>You don't need expensive equipment to create professional lighting at home. Here's a simple setup:</p>
              <ul>
                <li>
                  <strong>Ring Light:</strong> Affordable and creates even, flattering light with beautiful catchlights
                </li>
                <li>
                  <strong>White Reflector:</strong> Use a white poster board to bounce light and fill shadows
                </li>
                <li>
                  <strong>Diffusion:</strong> Place a white sheet over harsh light sources to soften them
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section data-chapter="2" className="border-t border-stone-200 bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <span className="mb-2 inline-block font-mono text-sm text-stone-400">Chapter 03</span>
              <h2 className="mb-4 font-serif text-4xl font-bold">Angles & Poses</h2>
              <p className="text-lg leading-relaxed text-stone-600">
                The right angle and pose can transform your selfie from awkward to amazing.
              </p>
            </div>

            <div className="prose prose-stone max-w-none">
              <h3>Finding Your Best Angle</h3>
              <p>Everyone has a "good side." Take time to discover yours by taking selfies from different angles:</p>
              <ul>
                <li>
                  <strong>The 45-Degree Turn:</strong> Turn your face slightly to one side—this is universally
                  flattering
                </li>
                <li>
                  <strong>The Chin Forward:</strong> Extend your chin slightly forward and down to define your jawline
                </li>
                <li>
                  <strong>The Head Tilt:</strong> A subtle tilt adds personality without looking forced
                </li>
              </ul>

              <h3>Natural Posing Techniques</h3>
              <p>The key to natural-looking selfies is movement. Instead of freezing in one position:</p>
              <ul>
                <li>Take a burst of photos while slowly moving your head</li>
                <li>Think of something that makes you genuinely smile</li>
                <li>Try the "fake laugh" technique—it often leads to real smiles</li>
                <li>Relax your shoulders and breathe naturally</li>
              </ul>

              <div className="my-8 rounded-lg bg-black p-8 text-center text-white">
                <h4 className="mb-4 font-serif text-2xl font-bold">Skip the Guesswork</h4>
                <p className="mb-6">
                  SSELFIE Studio generates hundreds of professional selfies with perfect angles automatically.
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black bg-transparent"
                  asChild
                >
                  <Link href="/studio">
                    Start Creating
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-chapter="3" className="border-t border-stone-200 bg-stone-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <span className="mb-2 inline-block font-mono text-sm text-stone-400">Chapter 04</span>
              <h2 className="mb-4 font-serif text-4xl font-bold">Editing Like a Pro</h2>
              <p className="text-lg leading-relaxed text-stone-600">
                Professional editing enhances your natural beauty without looking overdone.
              </p>
            </div>

            <div className="prose prose-stone max-w-none">
              <h3>The Professional Editing Workflow</h3>
              <p>Follow this order for the most natural-looking edits:</p>
              <ol>
                <li>
                  <strong>Crop & Straighten:</strong> Fix composition and horizon lines first
                </li>
                <li>
                  <strong>Exposure & Brightness:</strong> Adjust overall brightness without blowing out highlights
                </li>
                <li>
                  <strong>Contrast:</strong> Add depth and dimension to your photo
                </li>
                <li>
                  <strong>Saturation:</strong> Enhance colors subtly (less is more)
                </li>
                <li>
                  <strong>Sharpness:</strong> Add clarity to make your photo pop
                </li>
                <li>
                  <strong>Skin Retouching:</strong> Smooth skin while keeping texture
                </li>
              </ol>

              <h3>Best Editing Apps</h3>
              <ul>
                <li>
                  <strong>Lightroom Mobile:</strong> Professional-grade editing with presets
                </li>
                <li>
                  <strong>VSCO:</strong> Beautiful film-inspired filters
                </li>
                <li>
                  <strong>Facetune:</strong> Subtle retouching and smoothing
                </li>
                <li>
                  <strong>Snapseed:</strong> Free and powerful with selective editing
                </li>
              </ul>

              <div className="my-8 rounded-lg border border-stone-200 bg-white p-6">
                <h4 className="mb-2 flex items-center gap-2 font-bold">
                  <Edit3 className="h-5 w-5" />
                  Editing Mistakes to Avoid
                </h4>
                <ul className="mb-0">
                  <li>Over-smoothing skin (makes you look plastic)</li>
                  <li>Too much saturation (creates unnatural colors)</li>
                  <li>Heavy filters that hide your natural features</li>
                  <li>Excessive whitening of teeth and eyes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-chapter="4" className="border-t border-stone-200 bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <span className="mb-2 inline-block font-mono text-sm text-stone-400">Chapter 05</span>
              <h2 className="mb-4 font-serif text-4xl font-bold">Building Confidence</h2>
              <p className="text-lg leading-relaxed text-stone-600">
                True beauty comes from confidence. Here's how to develop it.
              </p>
            </div>

            <div className="prose prose-stone max-w-none">
              <h3>Overcoming Camera Shyness</h3>
              <p>Feeling awkward in front of the camera is normal. Here's how to get comfortable:</p>
              <ul>
                <li>
                  <strong>Practice in Private:</strong> Take selfies when you're alone to build comfort
                </li>
                <li>
                  <strong>Start with Video:</strong> Record yourself talking, then screenshot your favorite frames
                </li>
                <li>
                  <strong>Focus on Expression:</strong> Think about conveying emotion rather than looking perfect
                </li>
                <li>
                  <strong>Celebrate Progress:</strong> Compare your selfies from months ago to see improvement
                </li>
              </ul>

              <h3>Developing Your Signature Style</h3>
              <p>Your signature style makes you instantly recognizable:</p>
              <ul>
                <li>Choose consistent colors and tones in your photos</li>
                <li>Develop go-to poses that feel natural to you</li>
                <li>Find your preferred angles and stick with them</li>
                <li>Create a consistent editing style</li>
              </ul>

              <div className="my-8 rounded-lg border border-stone-200 bg-stone-50 p-6">
                <h4 className="mb-2 flex items-center gap-2 font-bold">
                  <Sparkles className="h-5 w-5" />
                  Confidence Affirmations
                </h4>
                <p className="mb-2">Repeat these before taking selfies:</p>
                <ul className="mb-0">
                  <li>"I am worthy of being seen"</li>
                  <li>"My unique features make me beautiful"</li>
                  <li>"I deserve to take up space"</li>
                  <li>"Confidence is my best accessory"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-chapter="5" className="border-t border-stone-200 bg-stone-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <span className="mb-2 inline-block font-mono text-sm text-stone-400">Chapter 06</span>
              <h2 className="mb-4 font-serif text-4xl font-bold">Social Strategy</h2>
              <p className="text-lg leading-relaxed text-stone-600">
                Turn your selfies into a powerful personal brand on social media.
              </p>
            </div>

            <div className="prose prose-stone max-w-none">
              <h3>Creating a Cohesive Instagram Feed</h3>
              <p>A cohesive feed attracts followers and builds your brand:</p>
              <ul>
                <li>
                  <strong>Color Palette:</strong> Stick to 3-5 main colors across all posts
                </li>
                <li>
                  <strong>Consistent Editing:</strong> Use the same filters and editing style
                </li>
                <li>
                  <strong>Grid Planning:</strong> Use apps like Preview to plan your feed layout
                </li>
                <li>
                  <strong>Mix Content Types:</strong> Alternate between selfies, lifestyle shots, and quotes
                </li>
              </ul>

              <h3>Optimizing for Engagement</h3>
              <p>Get more likes, comments, and followers with these strategies:</p>
              <ul>
                <li>
                  <strong>Post Timing:</strong> Share when your audience is most active (usually 7-9am and 5-7pm)
                </li>
                <li>
                  <strong>Captions That Connect:</strong> Share personal stories and ask questions
                </li>
                <li>
                  <strong>Strategic Hashtags:</strong> Use 10-15 relevant hashtags with varying popularity
                </li>
                <li>
                  <strong>Engage Authentically:</strong> Respond to comments and engage with your community
                </li>
              </ul>

              <div className="my-8 rounded-lg border border-stone-200 bg-white p-6">
                <h4 className="mb-2 flex items-center gap-2 font-bold">
                  <TrendingUp className="h-5 w-5" />
                  Growth Tips
                </h4>
                <ul className="mb-0">
                  <li>Post consistently (3-5 times per week minimum)</li>
                  <li>Use Instagram Stories daily to stay top-of-mind</li>
                  <li>Collaborate with other creators in your niche</li>
                  <li>Save and share your best-performing content</li>
                </ul>
              </div>

              <h3>Building Your Personal Brand</h3>
              <p>Your selfies should tell a story about who you are:</p>
              <ul>
                <li>Define your niche and what you want to be known for</li>
                <li>Show different aspects of your personality</li>
                <li>Be authentic—people connect with real, not perfect</li>
                <li>Share your journey, not just the highlights</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-y border-stone-200 bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">Ready to Put This Into Practice?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-stone-600">
            SSELFIE Studio generates professional AI selfies with perfect lighting, angles, and composition. No camera
            skills required—just upload 10 photos and get hundreds of stunning selfies.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-black hover:bg-black/90">
              <Link href="/studio">
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/maya">Chat with Maya AI</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-stone-600">
          <p>© 2025 SSELFIE Studio. Empowering women to feel confident and visible.</p>
          <p className="mt-2">
            <Link href="/studio" className="hover:text-black">
              Try SSELFIE Studio
            </Link>
            {" • "}
            <Link href="/maya" className="hover:text-black">
              Chat with Maya
            </Link>
            {" • "}
            <a href="https://instagram.com/sandra.social" className="hover:text-black">
              @sandra.social
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
