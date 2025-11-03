"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Download, Sparkles, Camera, Sun, Smile, Edit3, TrendingUp } from "lucide-react"
import Link from "next/link"

interface FreebieGuideContentProps {
  subscriberName: string
}

export function FreebieGuideContent({ subscriberName }: FreebieGuideContentProps) {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight - windowHeight
      const scrolled = window.scrollY
      const progress = Math.min((scrolled / documentHeight) * 100, 100)
      setScrollProgress(progress)
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
          <Button variant="outline" size="sm" asChild>
            <a href="/selfie-guide.pdf" download>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </Button>
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
            {chapters.map((chapter) => (
              <div
                key={chapter.number}
                className="group rounded-lg border border-stone-200 bg-white p-6 transition-all hover:border-black hover:shadow-lg"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 group-hover:bg-black group-hover:text-white">
                    <chapter.icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-sm text-stone-400">{chapter.number}</span>
                </div>
                <h3 className="mb-2 font-serif text-xl font-bold">{chapter.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{chapter.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chapter 1: Camera Mastery */}
      <section className="container mx-auto px-4 py-16">
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
      <section className="border-t border-stone-200 bg-stone-50 py-16">
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
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-y border-stone-200 bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">Want Perfect Selfies Without the Work?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-stone-600">
            SSELFIE Studio generates professional AI selfies with perfect lighting, angles, and composition. No camera
            skills required.
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
