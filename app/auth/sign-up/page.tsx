"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  buildReferralCallbackUrl,
  buildReferralLoginHref,
  getReferralCodeFromBrowser,
  persistReferralCode,
} from "@/lib/referrals/routing"
import { LIVE_MEMBER_APP_PATH, normalizeLegacyStudioRedirect, sanitizeRedirect } from "@/lib/security/url-validator"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userExists, setUserExists] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginHref, setLoginHref] = useState("/auth/login")
  const router = useRouter()

  const getRoutingContext = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const checkoutParam = urlParams.get("checkout")
    const checkoutDefaultReturnTo =
      checkoutParam === "studio_membership"
        ? "/checkout/membership"
        : checkoutParam === "brand_strategy_pack"
          ? "/checkout/masterclass"
          : LIVE_MEMBER_APP_PATH
    const returnTo = normalizeLegacyStudioRedirect(
      sanitizeRedirect(
        urlParams.get("returnTo"),
        checkoutDefaultReturnTo,
      ),
    )
    const next = urlParams.get("next")
    const referralCode = getReferralCodeFromBrowser(urlParams)
    const utmSource = urlParams.get("utm_source")

    return { checkoutParam, returnTo, next, referralCode, utmSource }
  }

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
      let redirectTo = normalizeLegacyStudioRedirect(sanitizeRedirect(next, returnTo))
      if (checkoutParam === "studio_membership") {
        redirectTo = "/checkout/membership"
      } else if (checkoutParam === "brand_strategy_pack") {
        redirectTo = "/checkout/masterclass"
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

      // Check if user was already confirmed (Supabase may auto-confirm if configured).
      // Always run the server action: it also creates the Neon application user. Previously,
      // auto-confirmed signups skipped that sync and landed in /app with failing Maya APIs.
      const userId = signUpData.user?.id
      const isAlreadyConfirmed = signUpData.user?.email_confirmed_at !== null

      if (userId) {
        const { autoConfirmUser } = await import("@/app/actions/auto-confirm-user")
        const confirmResult = await autoConfirmUser(email, userId)

        if (!confirmResult.success) {
          console.warn("[Sign Up] Auto-confirm failed:", confirmResult.error)
          // Don't throw - user was created, they can confirm via email link if needed
        } else if (!isAlreadyConfirmed) {
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
        let redirectTo = normalizeLegacyStudioRedirect(sanitizeRedirect(next, returnTo))
        if (checkoutParam === "studio_membership") {
          redirectTo = "/checkout/membership"
        } else if (checkoutParam === "brand_strategy_pack") {
          redirectTo = "/checkout/masterclass"
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

  const fieldClass =
    "h-12 rounded-[10px] border-[#C5C6C8] bg-white px-4 text-[15px] text-[#0D0E10] placeholder:text-[#818283] focus-visible:border-[#0D0E10] focus-visible:ring-[#0D0E10]/10"

  return (
    <main className="min-h-screen bg-[#F8FAFA] px-4 py-6 text-[#0D0E10] sm:px-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-[24px] border border-[#C5C6C8]/65 bg-white shadow-[0_24px_80px_rgba(13,14,16,0.08)] lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <section className="flex items-center px-5 py-8 sm:px-10 lg:py-12">
          <Card className="w-full border-0 bg-transparent py-0 shadow-none">
            <CardHeader className="px-0 pb-7">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#818283]">SSELFIE Studio</p>
              <CardTitle className="mt-3 font-serif text-[38px] font-light leading-[0.98] tracking-[-0.02em] text-[#0D0E10] sm:text-[46px]">
                {userExists ? "Welcome back." : "Start with one photo."}
              </CardTitle>
              <CardDescription className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#4F5052]">
                {userExists
                  ? "Sign in and pick up where you left off."
                  : "Create your account. Maya will show you the clearest next step for your access."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={userExists ? handleLogin : handleSignUp}>
                <div className="flex flex-col gap-5">
                  {!userExists && (
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-[11px] uppercase tracking-[0.18em] text-[#4F5052]">
                        Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Your name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className={fieldClass}
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor={userExists ? "email-existing" : "email"} className="text-[11px] uppercase tracking-[0.18em] text-[#4F5052]">
                      Email
                    </Label>
                    <Input
                      id={userExists ? "email-existing" : "email"}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={fieldClass}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={userExists ? "password-existing" : "password"} className="text-[11px] uppercase tracking-[0.18em] text-[#4F5052]">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id={userExists ? "password-existing" : "password"}
                        type={showPassword ? "text" : "password"}
                        autoComplete={userExists ? "current-password" : "new-password"}
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={userExists ? "Enter your password" : "At least 8 characters"}
                        className={`${fieldClass} pr-20`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-1 min-h-11 px-3 text-[11px] uppercase tracking-[0.12em] text-[#4F5052]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="rounded-[8px] bg-[#282728]/5 px-3 py-2.5 text-[13px] leading-relaxed text-[#282728]">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="min-h-12 w-full rounded-full bg-[#0D0E10] px-6 text-[12px] uppercase tracking-[0.16em] text-white shadow-none hover:bg-[#282728]"
                    disabled={isLoading}
                  >
                    {isLoading ? (userExists ? "Signing in…" : "Creating account…") : userExists ? "Sign In" : "Sign Up"}
                  </Button>
                </div>

                {!userExists && (
                  <p className="mt-4 text-center text-[11px] leading-relaxed text-[#6D6E70]">
                    By signing up, you agree to the{" "}
                    <Link href="/terms" className="underline underline-offset-2 hover:text-[#0D0E10]">Terms</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="underline underline-offset-2 hover:text-[#0D0E10]">Privacy Policy</Link>.
                  </p>
                )}

                <div className="mt-6 text-center text-[14px] text-[#4F5052]">
                  {userExists ? "New to SSELFIE?" : "Already have an account?"}{" "}
                  {userExists ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUserExists(false)
                        setEmail("")
                        setPassword("")
                        setError(null)
                      }}
                      className="min-h-11 font-medium text-[#0D0E10] underline underline-offset-4"
                    >
                      Sign up
                    </button>
                  ) : (
                    <Link href={loginHref} className="inline-flex min-h-11 items-center font-medium text-[#0D0E10] underline underline-offset-4">
                      Sign in
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <aside className="relative hidden min-h-[650px] overflow-hidden bg-[#282728] lg:block">
          <Image
            src="/landing/grid-after.png"
            alt="A cohesive SSELFIE visual grid"
            fill
            priority
            className="object-cover"
            sizes="560px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/85 via-[#0D0E10]/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">What happens next</p>
            <p className="mt-3 max-w-md font-serif text-[34px] font-light leading-tight">
              Your photo. Your voice. One clear place to keep creating.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
