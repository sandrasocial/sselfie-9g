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

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(false)
  const [userExists, setUserExists] = useState(false)
  const router = useRouter()

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

      // Success! Redirect to Studio with blueprint tab for new users
      const urlParams = new URLSearchParams(window.location.search)
      const nextParam = urlParams.get("next") || "/studio?tab=blueprint"
      router.push(nextParam)
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
      const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost"
      const redirectUrl = isLocalhost
        ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000/auth/callback"
        : `${window.location.origin}/auth/callback`

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

      // Auto-confirm email (like paid users) - no email waiting required
      // Use user ID from signup response if available (more efficient)
      const userId = signUpData.user?.id
      console.log("[Sign Up] Auto-confirming email for:", email, userId ? `(userId: ${userId})` : "")
      const confirmResponse = await fetch("/api/auth/auto-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId }),
      })

      if (!confirmResponse.ok) {
        const confirmError = await confirmResponse.json()
        console.error("[Sign Up] Auto-confirm error:", confirmError)
        // Don't throw - user was created, just email not confirmed yet
        // They can still click email confirmation link if needed
      } else {
        console.log("[Sign Up] ✅ Email auto-confirmed, signing in...")
        
        // Sign in immediately since email is confirmed
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (!signInError && signInData.session) {
          // Success! Redirect to Studio with blueprint tab for new users
          // Credits will be granted on Studio page load via middleware/API check
          const urlParams = new URLSearchParams(window.location.search)
          const nextParam = urlParams.get("next") || "/studio?tab=blueprint"
          console.log("[Sign Up] ✅ Signed in successfully, redirecting to:", nextParam)
          router.push(nextParam)
          return
        } else {
          console.error("[Sign Up] Sign in error:", signInError)
          // Fall through to sign-up-success page
        }
      }

      // Fallback: Redirect to success page (user can click email confirmation if auto-confirm failed)
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error("[Sign Up] Error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Create Your Account</CardTitle>
            <CardDescription className="text-zinc-400">
              Join SSELFIE and start creating stunning AI photos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userExists ? (
              // Password-only flow for existing users (like paid users)
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email-existing" className="text-zinc-200">
                      Email
                    </Label>
                    <Input
                      id="email-existing"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password-existing" className="text-zinc-200">
                      Password
                    </Label>
                    <Input
                      id="password-existing"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Enter your password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200" disabled={isLoading || checkingUser}>
                    {isLoading ? "Signing in..." : checkingUser ? "Checking..." : "Sign In"}
                  </Button>
                  <p className="text-xs text-center text-zinc-500">
                    New user?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setUserExists(false)
                        setEmail("")
                        setPassword("")
                        setError(null)
                      }}
                      className="text-white underline underline-offset-4"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              // Full signup form for new users
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-zinc-200">
                      Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
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
                    />
                    {checkingUser && <p className="text-xs text-zinc-500">Checking...</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-zinc-200">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200" disabled={isLoading || checkingUser}>
                    {isLoading ? "Creating account..." : checkingUser ? "Checking..." : "Sign Up"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-zinc-400">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-white underline underline-offset-4">
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
