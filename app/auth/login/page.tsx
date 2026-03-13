"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { buildReferralSignUpHref, getReferralCodeFromBrowser, persistReferralCode } from "@/lib/referrals/routing"
import { sanitizeRedirect } from "@/lib/security/url-validator"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = sanitizeRedirect(searchParams.get("returnTo"), "/studio")
  const referralCode = getReferralCodeFromBrowser(searchParams)
  const signUpHref = buildReferralSignUpHref({ returnTo, referralCode })

  useEffect(() => {
    persistReferralCode(referralCode)
  }, [referralCode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log("[v0] ===== LOGIN ATTEMPT STARTED =====")
    console.log("[v0] Email:", email)
    console.log("[v0] Return to:", returnTo)
    console.log("[v0] Current URL:", window.location.href)
    console.log("[v0] Current domain:", window.location.hostname)
    console.log("[v0] Protocol:", window.location.protocol)
    console.log("[v0] Existing cookies:", document.cookie)

    try {
      const supabase = createClient()
      console.log("[v0] Supabase client created successfully")

      // Check current session
      const { data: sessionData } = await supabase.auth.getSession()
      console.log("[v0] Current session before login:", sessionData.session ? "Exists" : "None")

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("[v0] signInWithPassword response:", {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message || null,
      })

      if (error) {
        console.error("[v0] ❌ Login error:", error)

        if (error.message?.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please try again.")
        } else if (error.message?.includes("Email not confirmed")) {
          throw new Error("Please confirm your email before logging in. Check your inbox.")
        } else if (error.message?.includes("network")) {
          throw new Error("Network error. Please check your internet connection and try again.")
        }
        throw error
      }

      if (!data.user || !data.session) {
        console.error("[v0] ❌ Login succeeded but no user or session returned")
        throw new Error("Login failed: No user session created")
      }

      console.log("[v0] ✅ Login successful for:", data.user.email)
      console.log("[v0] Session expires at:", data.session.expires_at)
      console.log("[v0] Access token length:", data.session.access_token?.length || 0)
      console.log("[v0] Refresh token length:", data.session.refresh_token?.length || 0)

      console.log("[v0] Waiting for cookies to be persisted...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verify session was persisted
      const { data: verifyData } = await supabase.auth.getSession()
      console.log("[v0] Session after login:", verifyData.session ? "✅ Persisted" : "❌ Not persisted")
      console.log("[v0] Cookies after login:", document.cookie)

      if (!verifyData.session) {
        console.error("[v0] ❌ CRITICAL: Session not persisted in cookies!")
        throw new Error(
          "Authentication succeeded but session could not be saved. This may be a cookie configuration issue. Please try again or contact support.",
        )
      }

      console.log("[v0] Redirecting to:", returnTo)

      window.location.href = returnTo
    } catch (error: unknown) {
      console.error("[v0] ❌ Login error caught:", error)
      setError(error instanceof Error ? error.message : "An error occurred during login")
      setIsLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-6 bg-[#0d0c0b]"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,164,156,0.08) 0%, #0d0c0b 70%)" }}
    >
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] items-stretch">
        <Card className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl">
          <CardHeader className="pb-6">
            <div className="mb-2">
              <span className="font-['Cormorant_Garamond'] text-3xl text-[#f0ede8] tracking-[0.3em] uppercase font-light">SSELFIE</span>
            </div>
            <CardTitle className="font-['Cormorant_Garamond'] font-light text-2xl text-[#f0ede8] tracking-wide">Welcome back</CardTitle>
            <CardDescription className="font-['Inter'] text-[#8a8780] text-sm">Sign in to access your AI photography studio</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-5">
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
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-[#a8a49c] hover:text-[#c8c4bb] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
              <div className="mt-5 text-center text-sm text-[#8a8780]">
                Don&apos;t have an account?{" "}
                <Link href={signUpHref} className="text-[#a8a49c] hover:text-[#c8c4bb] transition-colors">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="hidden lg:flex flex-col justify-between rounded-2xl border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.06)] p-8">
          <div>
            <p className="font-['Inter'] text-[10px] uppercase tracking-[0.35em] text-[#8a8780] mb-4">Trusted by creators</p>
            <h2 className="font-['Cormorant_Garamond'] font-light text-3xl text-[#f0ede8] leading-tight mb-6">
              180K+ creators follow Sandra&apos;s methods.
            </h2>
            <p className="font-['Inter'] text-sm text-[#8a8780] leading-relaxed">
              Built on grit and consistency, not big budgets. The same playbook now powers your studio.
            </p>
          </div>

          <div className="space-y-4 mt-8">
            <blockquote className="rounded-xl border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] p-4">
              <p className="font-['Inter'] text-sm text-[#f0ede8] leading-relaxed">
                &ldquo;I got my first on-brand photos in one evening. It finally feels like me.&rdquo;
              </p>
              <p className="font-['Inter'] text-xs uppercase tracking-[0.25em] text-[#8a8780] mt-3">Studio Member</p>
            </blockquote>
            <blockquote className="rounded-xl border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] p-4">
              <p className="font-['Inter'] text-sm text-[#f0ede8] leading-relaxed">
                &ldquo;No stock-photo energy. My content now actually looks like my brand.&rdquo;
              </p>
              <p className="font-['Inter'] text-xs uppercase tracking-[0.25em] text-[#8a8780] mt-3">Selfie Guide Buyer</p>
            </blockquote>
          </div>
        </aside>
      </div>
    </div>
  )
}
