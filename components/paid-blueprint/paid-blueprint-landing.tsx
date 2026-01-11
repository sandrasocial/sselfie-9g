"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BlueprintEmailCapture } from "@/components/blueprint/blueprint-email-capture"

/**
 * Paid Blueprint Landing Page Component
 * 
 * Reuses:
 * - Homepage hero styling (Times New Roman, stone colors, gradient overlays)
 * - Images from free blueprint page (grid examples, background)
 * - Same feature flag logic as checkout page
 * - Pricing card style from main landing page
 * - Email capture component from free blueprint
 * 
 * Flow: Button → Email Capture Modal → Checkout
 */
export default function PaidBlueprintLanding() {
  const router = useRouter()
  const [showEmailModal, setShowEmailModal] = useState(false)

  // Scroll to section handler
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Handle email capture success - route to checkout
  const handleEmailSuccess = (email: string, name: string, accessToken: string) => {
    setShowEmailModal(false)
    // Route to checkout with email
    router.push(`/checkout/blueprint?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-5 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
          <Link href="/" className="text-xl text-white tracking-[0.05em]">
            SSELFIE
          </Link>
        </div>
        <Link
          href="/feed-planner"
          className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white opacity-90 hover:opacity-100 transition-opacity py-2"
        >
          Free Blueprint
        </Link>
      </nav>

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-end justify-center overflow-hidden"
        style={{
          minHeight: "100dvh",
        }}
      >
        {/* Background Image - same as free blueprint page */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/x7d928rnjsrmr0cvknvss5q6xm-B9fjSTkpQhQHUq3pBPExL4Pjcm5jNU.png')",
            backgroundPosition: "50% 25%",
          }}
        />
        {/* Dark Overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          }}
        />
        {/* Gradient Overlay - same as homepage */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        {/* Hero Content - positioned at bottom */}
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 pb-8 sm:pb-20 pt-8 sm:pt-20">
          <span
            className="block mb-2 sm:mb-4 text-xs sm:text-base font-light tracking-[0.2em] uppercase text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
          >
            Your Blueprint
          </span>
          <h1
            style={{
              fontFamily: "'Times New Roman', serif",
              fontStyle: "normal",
              fontWeight: 300,
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
            className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-2 sm:mb-6 text-white leading-[1.1] tracking-tight"
          >
            Get 30 custom photos that look like you
          </h1>
          <p
            className="text-sm sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-8 max-w-xl mx-auto text-white"
            style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}
          >
            Get 30 custom photos made just for your brand. Download and post them today.
          </p>

          {/* Direct CTA Button */}
          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 inline-block min-h-[40px] sm:min-h-[44px] flex items-center justify-center whitespace-nowrap"
            >
              Get My 30 Photos →
            </button>
          </div>

          <button
            onClick={() => scrollToSection("what-you-get")}
            className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors underline"
          >
            See what's inside ↓
          </button>
        </div>
      </section>

      {/* What You Get Section */}
      <section id="what-you-get" className="py-16 sm:py-24 bg-stone-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-8 sm:mb-12 text-center"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            What You Get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-3">
              <h3 className="text-xl font-light text-white mb-2">30 Custom Photos</h3>
              <p className="text-sm sm:text-base font-light text-stone-300 leading-relaxed">
                Photos that actually look like you, tailored to your unique style and brand aesthetic.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-light text-white mb-2">Ready to Use</h3>
              <p className="text-sm sm:text-base font-light text-stone-300 leading-relaxed">
                Download them instantly. No waiting, no complicated process. Just photos you can use right away.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-light text-white mb-2">It's That Simple</h3>
              <p className="text-sm sm:text-base font-light text-stone-300 leading-relaxed">
                Upload your selfies. We'll create all 30 photos automatically. No manual work, no stress.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-light text-white mb-2">Your Brand Aesthetic</h3>
              <p className="text-sm sm:text-base font-light text-stone-300 leading-relaxed">
                Photos match the mood you chose in your free blueprint: luxury, minimal, or beige. All you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Card Section */}
      <section className="py-16 sm:py-24 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="max-w-md mx-auto">
            <div className="pricing-card fade-up relative overflow-hidden group">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-serif text-white">Paid Blueprint</h3>
                  <p className="text-stone-400 text-[10px] uppercase tracking-wider">One-Time Purchase</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-serif">$47</span>
                  <span className="text-[9px] uppercase text-stone-500 block">one-time</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
                <p>• 30 custom brand photos</p>
                <p>• Matches your blueprint aesthetic</p>
                <p>• Ready to download instantly</p>
                <p>• No subscription required</p>
              </div>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn w-full text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get My 30 Photos →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-12 sm:mb-16 text-center"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-xl font-light">
                1
              </div>
              <h3 className="text-lg font-light text-white mb-2">Answer Questions</h3>
              <p className="text-sm font-light text-stone-400 leading-relaxed">
                Complete your free brand blueprint if you haven't already. It takes just 3 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-xl font-light">
                2
              </div>
              <h3 className="text-lg font-light text-white mb-2">Get Your Blueprint</h3>
              <p className="text-sm font-light text-stone-400 leading-relaxed">
                Receive your personalized strategy, content calendar, and caption templates.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-xl font-light">
                3
              </div>
              <h3 className="text-lg font-light text-white mb-2">Get Your Photos</h3>
              <p className="text-sm font-light text-stone-400 leading-relaxed">
                Upload 1-3 selfies and we'll create 30 custom photos that look like you. It's that simple.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Proof Section - Reusing images from free blueprint page */}
      <section id="visual-proof" className="py-16 sm:py-24 bg-stone-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6 text-center"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            See It In Action
          </h2>
          <p className="text-sm sm:text-base font-light text-stone-300 text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            Here are 3 grid examples showing the same personal branding strategy across different aesthetics. Notice how each grid maintains consistent visibility while expressing a completely different style.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Dark & Moody */}
            <div className="space-y-3">
              <div className="aspect-square rounded-lg border-2 border-stone-300 overflow-hidden relative bg-stone-800">
                <Image
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/darkandmoody.png"
                  alt="Dark and moody aesthetic grid example"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-center">
                <span className="inline-block px-4 py-1 bg-white text-black text-xs tracking-wider uppercase font-medium rounded-full">
                  Dark & Moody
                </span>
              </div>
            </div>

            {/* Light & Minimalistic */}
            <div className="space-y-3">
              <div className="aspect-square rounded-lg border-2 border-stone-300 overflow-hidden relative bg-stone-800">
                <Image
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/Light%20%26%20Minimalistic.png"
                  alt="Light and minimalistic aesthetic grid example"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-center">
                <span className="inline-block px-4 py-1 bg-white text-black text-xs tracking-wider uppercase font-medium rounded-full">
                  Light & Minimalistic
                </span>
              </div>
            </div>

            {/* Beige Aesthetic */}
            <div className="space-y-3">
              <div className="aspect-square rounded-lg border-2 border-stone-300 overflow-hidden relative bg-stone-800">
                <Image
                  src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/Beige%20Aesthetic.png"
                  alt="Beige aesthetic grid example"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-center">
                <span className="inline-block px-4 py-1 bg-white text-black text-xs tracking-wider uppercase font-medium rounded-full">
                  Beige Aesthetic
                </span>
              </div>
            </div>
          </div>
          <div className="mt-8 sm:mt-12 bg-white/5 p-6 rounded-lg max-w-3xl mx-auto">
            <p className="text-sm font-light leading-relaxed text-stone-300 text-center">
              <strong className="text-white">See the pattern?</strong> Each grid uses a completely different aesthetic (light, dark, beige) but they all maintain consistent visibility. That's what builds your personal brand. Your paid blueprint will help you create this cohesive look based on YOUR unique style.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-8 sm:mb-12 text-center"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Common Questions
          </h2>
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-lg font-light text-white mb-2">How long does it take?</h3>
              <p className="text-sm sm:text-base font-light text-stone-400 leading-relaxed">
                Once you upload your selfies, we start creating immediately. All 30 photos are ready in just a few seconds. You'll get an email when they're done.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-light text-white mb-2">Do I need the free blueprint first?</h3>
              <p className="text-sm sm:text-base font-light text-stone-400 leading-relaxed">
                Yes. The free blueprint helps us understand your brand and style, so your 30 photos actually look like you and match your aesthetic.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-light text-white mb-2">Are the photos mine?</h3>
              <p className="text-sm sm:text-base font-light text-stone-400 leading-relaxed">
                Yes, you own everything you create. Download and use them however you'd like: social media, website, anywhere you need professional brand photos.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-light text-white mb-2">What if I'm not happy?</h3>
              <p className="text-sm sm:text-base font-light text-stone-400 leading-relaxed">
                We want you to love your photos. If something doesn't match your vision, just reach out and we'll work with you to get it right.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-stone-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-4 sm:mb-6"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Ready to Bring Your Blueprint to Life?
          </h2>
          <p className="text-base sm:text-lg font-light leading-relaxed text-stone-300 mb-8 sm:mb-10">
            Get 30 custom photos that look like you, based on your brand strategy. $47 one-time. Ready to download and use right away.
          </p>

          {/* Direct CTA Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 inline-block min-h-[44px] flex items-center justify-center whitespace-nowrap"
            >
              Get My 30 Photos →
            </button>
          </div>

          <p className="text-xs sm:text-sm font-light text-stone-400">
            One-time payment • Instant access • No subscription
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div style={{ fontFamily: "'Times New Roman', serif" }} className="text-lg text-white tracking-[0.2em] uppercase">
              SSELFIE
            </div>
            <div className="flex gap-6 text-xs sm:text-sm font-light text-stone-400">
              <Link href="/terms" className="hover:text-white transition">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-stone-500">
            &copy; {new Date().getFullYear()} SSELFIE. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Email Capture Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-[600px] max-h-[90vh] overflow-auto rounded-lg">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 z-10 text-white hover:text-stone-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div style={{ minHeight: "500px" }}>
              <BlueprintEmailCapture 
                onSuccess={handleEmailSuccess}
                formData={{}}
                currentStep={0}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pricing Card Styles - matching main landing page */}
      <style jsx>{`
        .pricing-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 24px;
          margin-bottom: 12px;
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        @media (min-width: 768px) {
          .pricing-card {
            padding: 32px;
            margin-bottom: 16px;
          }
        }
        .pricing-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .fade-up {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s ease forwards;
        }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .btn {
          background: white;
          color: black;
          padding: 12px 24px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          text-decoration: none;
          display: inline-block;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          text-align: center;
        }
        .btn:hover {
          background: #f5f5f4;
          transform: translateY(-1px);
        }
        .btn:active {
          transform: scale(0.96);
          opacity: 0.9;
        }
        .btn.w-full {
          width: 100%;
        }
      `}</style>
    </div>
  )
}
