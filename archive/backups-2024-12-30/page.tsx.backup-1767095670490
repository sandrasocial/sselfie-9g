"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || "/studio"

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
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Welcome to SSELFIE</CardTitle>
            <CardDescription className="text-zinc-400">Sign in to access your AI photography studio</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-zinc-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-zinc-200">
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
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
                    className="bg-zinc-800 border-zinc-700 text-white"
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link href="/auth/sign-up" className="text-white underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
