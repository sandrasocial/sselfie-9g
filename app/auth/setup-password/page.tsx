"use client"

import type React from "react"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { LIVE_MEMBER_APP_PATH, normalizeLegacyStudioRedirect, sanitizeRedirect } from "@/lib/security/url-validator"
import { VaultMayaSuccess } from "@/components/checkout/vault-maya-success"

function SetupPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const nextAfterSetup = normalizeLegacyStudioRedirect(
    sanitizeRedirect(searchParams.get("next"), LIVE_MEMBER_APP_PATH),
  )

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setError("Authentication is temporarily unavailable. Please request a new setup link or contact support.")
      setCheckingAuth(false)
      return
    }

    let active = true
    let recoveryReady = false

    const acceptUser = (email?: string | null) => {
      if (!active) return
      recoveryReady = true
      setUserEmail(email || "")
      setCheckingAuth(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      ) {
        if (session?.user) {
          acceptUser(session.user.email)
        }
      }
    })

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        acceptUser(data.user.email)
      }
    })

    const authTimeout = window.setTimeout(() => {
      if (!active || recoveryReady) return
      const errorUrl = `/auth/error?error=${encodeURIComponent(
        "Please use a fresh link from your email"
      )}&next=${encodeURIComponent(nextAfterSetup)}`
      router.replace(errorUrl)
    }, 3500)

    return () => {
      active = false
      window.clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [nextAfterSetup, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      if (!supabase) {
        throw new Error("Authentication is temporarily unavailable. Please request a new setup link.")
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      // This marker revokes the reusable Skool setup entry by making future
      // exchanges route to normal login. It is security-critical: do not let
      // the member leave setup until the marker is durably written.
      const completionResponse = await fetch("/api/auth/password-setup-complete", {
        method: "POST",
      })

      if (!completionResponse.ok) {
        throw new Error(
          "Your password was saved, but we could not finish securing your account. Please press Continue again."
        )
      }

      console.log("[v0] Password set successfully, redirecting to:", nextAfterSetup)
      router.push(nextAfterSetup)
    } catch (err: unknown) {
      console.error("[v0] Error setting password:", err)
      setError(err instanceof Error ? err.message : "Failed to set password. Please try again.")
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-900" />
      </div>
    )
  }

  if (nextAfterSetup === "/vault-maya/studio") {
    return (
      <VaultMayaSuccess
        email={userEmail || "your email"}
        mode="setup"
        showNameField={false}
        password={password}
        confirmPassword={confirmPassword}
        error={error}
        isSubmitting={loading}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSetupSubmit={handleSubmit}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Set Your Password</CardTitle>
          <CardDescription className="text-center">
            Welcome to SSelfie! Create a password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userEmail && (
            <div className="mb-4 p-3 bg-stone-100 rounded-lg">
              <p className="text-sm text-stone-600">
                Account: <span className="font-medium text-stone-900">{userEmail}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-stone-500">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : nextAfterSetup === LIVE_MEMBER_APP_PATH ? (
                "Continue to SSELFIE"
              ) : (
                "Open Your Library"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <Loader2 className="h-8 w-8 animate-spin text-stone-900" />
        </div>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  )
}
