"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Loader2 } from "lucide-react"

/**
 * Free Blueprint Landing Page Component
 * 
 * Simple full-bleed hero with embedded signup modal
 * Same design as paid blueprint landing page
 */
export default function BlueprintLanding() {
  const router = useRouter()
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setIsProcessing(true)
    setError(null)

    try {
      const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost"
      const redirectUrl = isLocalhost
        ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000/auth/callback"
        : `${window.location.origin}/auth/callback`

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
          },
        },
      })

      if (signUpError) throw signUpError

      // Check if user was already confirmed (Supabase may auto-confirm if configured)
      const userId = signUpData.user?.id
      const isAlreadyConfirmed = signUpData.user?.email_confirmed_at !== null

      if (isAlreadyConfirmed) {
        console.log("[Blueprint Landing] ✅ User already confirmed, signing in...")
      } else if (userId) {
        // Auto-confirm email for free signups - simple server action
        console.log("[Blueprint Landing] Auto-confirming email for:", email)
        const { autoConfirmUser } = await import("@/app/actions/auto-confirm-user")
        const confirmResult = await autoConfirmUser(email, userId)
        
        if (!confirmResult.success) {
          console.warn("[Blueprint Landing] Auto-confirm failed:", confirmResult.error)
          // Don't throw - user was created, they can confirm via email link if needed
        } else {
          console.log("[Blueprint Landing] ✅ Email auto-confirmed")
        }
      }

      // Sign in immediately (works if email is confirmed)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInError && signInData.session) {
        // Keep modal open briefly to show success, then redirect
        setTimeout(() => {
          setShowSignupModal(false)
          router.push("/studio?tab=feed-planner")
        }, 500)
        return
      }

      // Fallback: Redirect to success page (user can click email confirmation if needed)
      console.log("[Blueprint Landing] Sign in failed, redirecting to success page:", signInError?.message)
      setTimeout(() => {
        setShowSignupModal(false)
        router.push("/auth/sign-up-success")
      }, 500)
    } catch (error: unknown) {
      console.error("[Blueprint Landing] Sign up error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsProcessing(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation - same as paid blueprint */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-5 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
          <Link href="/" className="text-xl text-white tracking-[0.05em]">
            SSELFIE
          </Link>
        </div>
        <Link
          href="/auth/login"
          className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white opacity-90 hover:opacity-100 transition-opacity py-2"
        >
          Login
        </Link>
      </nav>

      {/* Hero Section - same as paid blueprint */}
      <section
        className="relative min-h-screen flex items-end justify-center overflow-hidden"
        style={{
          minHeight: "100dvh",
        }}
      >
        {/* Background Image - same as paid blueprint */}
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
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        {/* Hero Content - positioned at bottom, ensure text doesn't cover face */}
        {/* Using padding-bottom to push content down and avoid covering face area */}
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 pb-16 sm:pb-24 md:pb-32 pt-8 sm:pt-20">
          <span
            className="block mb-2 sm:mb-4 text-xs sm:text-base font-light tracking-[0.2em] uppercase text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
          >
            YOUR FREE BLUEPRINT
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
            Plan your Instagram feed for free
          </h1>
          <p
            className="text-sm sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-8 max-w-xl mx-auto text-white"
            style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}
          >
            Create your feed layout, get caption templates, and see your content strategy. Start planning your Instagram today.
          </p>

          {/* CTA Button */}
          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => setShowSignupModal(true)}
              className="bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 inline-block min-h-[40px] sm:min-h-[44px] flex items-center justify-center whitespace-nowrap"
            >
              Get Started Free →
            </button>
          </div>
        </div>
      </section>

      {/* Signup Modal Overlay */}
      {showSignupModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => !isProcessing && setShowSignupModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {!isProcessing && (
              <button
                onClick={() => setShowSignupModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            )}

            {isProcessing ? (
              // Processing State - Show loading indicator
              <div className="text-center py-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={32} className="text-white animate-spin" />
                  <div className="space-y-2">
                    <h2 className="text-xl text-white font-medium">Creating your account</h2>
                    <p className="text-sm text-zinc-400">
                      This will just take a moment...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Signup Form
              <>
                <div className="mb-6">
                  <h2 className="text-2xl text-white mb-2">Create Your Free Account</h2>
                  <p className="text-sm text-zinc-400">
                    Start planning your Instagram feed today
                  </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-zinc-200 text-sm mb-2 block">
                      Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-zinc-200 text-sm mb-2 block">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-zinc-200 text-sm mb-2 block">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-white text-black hover:bg-zinc-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      "Sign Up Free"
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-zinc-500 mt-4">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-white underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
