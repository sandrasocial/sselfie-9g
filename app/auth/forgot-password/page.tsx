"use client"

import type React from "react"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { Mail, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import {
  LIVE_MEMBER_APP_PATH,
  normalizeLegacyStudioRedirect,
  sanitizeRedirect,
} from "@/lib/security/url-validator"

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const nextAfterReset = normalizeLegacyStudioRedirect(
    sanitizeRedirect(searchParams.get("next"), LIVE_MEMBER_APP_PATH)
  )

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        window.location.origin
      const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextAfterReset)}`

      console.log("[v0] 📧 Sending password reset email to:", email)
      console.log("[v0] 🔗 Redirect URL being sent to Supabase:", redirectUrl)
      console.log("[v0] 🌐 Window origin:", window.location.origin)
      console.log("[v0] 🔑 Site URL env:", process.env.NEXT_PUBLIC_SITE_URL)
      console.log("[v0] 🔑 App URL env:", process.env.NEXT_PUBLIC_APP_URL)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      console.log("[v0] ✅ Password reset email sent successfully to Supabase")
      setSuccess(true)
    } catch (error: unknown) {
      console.error("[v0] ❌ Password reset error:", error)
      setError(
        error instanceof Error ? error.message : "Failed to send reset email. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center p-6 bg-[#0d0c0b]"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(168,164,156,0.08) 0%, #0d0c0b 70%)",
        }}
      >
        <div className="w-full max-w-sm">
          <Card className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl">
            <CardHeader className="pb-6">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-[rgba(168,164,156,0.15)] border border-[rgba(195,190,182,0.25)] p-3">
                  <Mail className="h-6 w-6 text-[#c8c4bb]" />
                </div>
              </div>
              <CardTitle className="font-['Cormorant_Garamond'] font-light text-2xl text-center text-[#f0ede8] tracking-wide">
                Check your email
              </CardTitle>
              <CardDescription className="text-center text-[#8a8780] font-['Inter'] text-sm">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-medium text-[#c8c4bb]">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-[rgba(175,170,162,0.08)] border border-[rgba(195,190,182,0.15)] p-4">
                <p className="text-sm text-[#8a8780] leading-relaxed">
                  Click the link in the email to reset your password. The link will expire in 1
                  hour.
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-[#a8a49c] hover:text-[#c8c4bb] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-6 bg-[#0d0c0b]"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(168,164,156,0.08) 0%, #0d0c0b 70%)",
      }}
    >
      <div className="w-full max-w-sm">
        <Card className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl">
          <CardHeader className="pb-6">
            <div className="mb-2">
              <span className="font-['Cormorant_Garamond'] text-3xl text-[#f0ede8] tracking-[0.3em] uppercase font-light">
                SSELFIE
              </span>
            </div>
            <CardTitle className="font-['Cormorant_Garamond'] font-light text-2xl text-[#f0ede8] tracking-wide">
              Reset your password
            </CardTitle>
            <CardDescription className="font-['Inter'] text-[#8a8780] text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label
                    htmlFor="email"
                    className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-[#8a8780]"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.25)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.5)]"
                    autoFocus
                  />
                </div>

                {error && (
                  <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/30 rounded-xl"
                  >
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending reset link..." : "Send Reset Link"}
                </Button>
              </div>

              <div className="mt-5 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-[#a8a49c] hover:text-[#c8c4bb] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
