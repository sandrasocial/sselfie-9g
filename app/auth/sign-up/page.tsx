"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  buildReferralCallbackUrl,
  buildReferralLoginHref,
  getReferralCodeFromBrowser,
  persistReferralCode,
} from "@/lib/referrals/routing"
import { sanitizeRedirect } from "@/lib/security/url-validator"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(false)
  const [userExists, setUserExists] = useState(false)
  const [loginHref, setLoginHref] = useState("/auth/login")
  const router = useRouter()

  const getRoutingContext = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const checkoutParam = urlParams.get("checkout")
    const checkoutDefaultReturnTo =
      checkoutParam === "studio_membership"
        ? "/checkout/membership"
        : checkoutParam === "brand_strategy_pack"
          ? "/checkout/brand-strategy-pack"
          : "/studio"
    const returnTo = sanitizeRedirect(
      urlParams.get("returnTo"),
      checkoutDefaultReturnTo,
    )
    const next = urlParams.get("next")
    const referralCode = getReferralCodeFromBrowser(urlParams)
    const utmSource = urlParams.get("utm_source")

    return { checkoutParam, returnTo, next, referralCode, utmSource }
  }

  // Check if user exists when email is entered (debounced)
  useEffect(() => {
    if (!email || !email.includes("@")) {
      setUserExists(false)
      return
    }

    const checkUser = async () => {
      setCheckingUser(true)
      try {
        // Check if user exists in database (users table)
        const response = await fetch(`/api/user-by-email?email=${encodeURIComponent(email)}`)
        if (response.ok) {
          const data = await response.json()
          // userInfo.hasAccount means user exists in users table
          setUserExists(!!data.userInfo?.hasAccount)
        } else {
          setUserExists(false)
        }
      } catch (error) {
        console.error("[Sign Up] Error checking user:", error)
        setUserExists(false)
      } finally {
        setCheckingUser(false)
      }
    }

    // Debounce check (wait 500ms after user stops typing)
    const timeoutId = setTimeout(checkUser, 500)
    return () => clearTimeout(timeoutId)
  }, [email])

  useEffect(() => {
    const { returnTo, referralCode } = getRoutingContext()
    setLoginHref(buildReferralLoginHref({ returnTo, referralCode }))
    persistReferralCode(referralCode)
  }, [])

  // Handle login for existing users (password-only flow)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message?.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please try again.")
        } else if (signInError.message?.includes("Email not confirmed")) {
          throw new Error("Please confirm your email before logging in. Check your inbox.")
        }
        throw signInError
      }

      if (!data.user || !data.session) {
        throw new Error("Login failed: No user session created")
      }

      // Success! Redirect to Studio (Maya by default for first-time flow)
      const { checkoutParam, returnTo, next } = getRoutingContext()
      let redirectTo = sanitizeRedirect(next, returnTo)
      if (checkoutParam === "studio_membership") {
        redirectTo = "/checkout/membership"
      } else if (checkoutParam === "brand_strategy_pack") {
        redirectTo = "/checkout/brand-strategy-pack"
      }
      router.push(redirectTo)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Check if we're on localhost for development, otherwise use current origin
      const { referralCode, utmSource } = getRoutingContext()
      const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost"
      const redirectUrl = isLocalhost
        ? buildReferralCallbackUrl(
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000",
            { referralCode, utmSource },
          )
        : buildReferralCallbackUrl(window.location.origin, { referralCode, utmSource })

      // Sign up user
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
        console.log("[Sign Up] ✅ User already confirmed, signing in...")
      } else if (userId) {
        // Auto-confirm email for free signups - simple server action
        console.log("[Sign Up] Auto-confirming email for:", email)
        const { autoConfirmUser } = await import("@/app/actions/auto-confirm-user")
        const confirmResult = await autoConfirmUser(email, userId)
        
        if (!confirmResult.success) {
          console.warn("[Sign Up] Auto-confirm failed:", confirmResult.error)
          // Don't throw - user was created, they can confirm via email link if needed
        } else {
          console.log("[Sign Up] ✅ Email auto-confirmed")
        }
      }

      // Sign in immediately (works if email is confirmed)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInError && signInData.session) {
        // Success! Redirect to Studio (Maya by default for first-time flow)
        const { checkoutParam, returnTo, next, referralCode } = getRoutingContext()
        let redirectTo = sanitizeRedirect(next, returnTo)
        if (checkoutParam === "studio_membership") {
          redirectTo = "/checkout/membership"
        } else if (checkoutParam === "brand_strategy_pack") {
          redirectTo = "/checkout/brand-strategy-pack"
        }

        if (referralCode) {
          try {
            const trackResponse = await fetch("/api/referrals/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referralCode }),
            })

            if (!trackResponse.ok) {
              console.log("[Sign Up] Referral tracking failed:", await trackResponse.text())
            }
          } catch (referralError) {
            console.error("[Sign Up] Referral tracking error:", referralError)
          }
        }

        console.log("[Sign Up] ✅ Signed in successfully, redirecting to:", redirectTo)
        router.push(redirectTo)
        return
      }

      // If sign-in failed (email not confirmed), redirect to success page
      // User can click email confirmation link if needed
      console.log("[Sign Up] Sign in failed, redirecting to success page:", signInError?.message)
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error("[Sign Up] Error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-[#0d0c0b]" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,164,156,0.08) 0%, #0d0c0b 70%)" }}>
      <div className="w-full max-w-sm">
        <Card className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl">
          <CardHeader className="pb-6">
            <div className="mb-2">
              <span className="font-['Cormorant_Garamond'] text-3xl text-[#f0ede8] tracking-[0.3em] uppercase font-light">SSELFIE</span>
            </div>
            <CardTitle className="font-['Cormorant_Garamond'] font-light text-2xl text-[#f0ede8] tracking-wide">Create your account</CardTitle>
            <CardDescription className="font-['Inter'] text-[#8a8780] text-sm">
              Join SSELFIE and start creating stunning AI photos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userExists ? (
              // Password-only flow for existing users (like paid users)
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="email-existing" className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">
                      Email
                    </Label>
                    <Input
                      id="email-existing"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password-existing" className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">
                      Password
                    </Label>
                    <Input
                      id="password-existing"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                      placeholder="Enter your password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  <Button type="submit" className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <p className="text-xs text-center text-[#8a8780]">
                    New user?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setUserExists(false)
                        setEmail("")
                        setPassword("")
                        setError(null)
                      }}
                      className="text-[#a8a49c] hover:text-[#c8c4bb] transition-colors"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              // Full signup form for new users
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">
                      Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                    />
                    {checkingUser && <p className="text-xs text-[#8a8780]">Checking...</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                    />
                  </div>
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  <Button type="submit" className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </div>
                <div className="mt-5 text-center text-sm text-[#8a8780]">
                  Already have an account?{" "}
                  <Link href={loginHref} className="text-[#a8a49c] hover:text-[#c8c4bb] transition-colors">
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
