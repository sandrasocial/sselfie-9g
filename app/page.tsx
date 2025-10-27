import { createServerClient } from "@/lib/supabase/server"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export default async function Home() {
  console.log("[v0] Home page loading...")

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Supabase Auth user:", user ? { id: user.id, email: user.email } : "none")

  if (!user) {
    console.log("[v0] No authenticated user, redirecting to login")
    redirect("/auth/login")
  }

  const neonUser = await getCurrentNeonUser()

  console.log("[v0] Neon user:", neonUser ? { id: neonUser.id, email: neonUser.email } : "none")

  if (!neonUser) {
    // User is authenticated but not synced with Neon yet
    console.error("[v0] User authenticated but not found in Neon database")
    redirect("/auth/login")
  }

  console.log("[v0] Loaded Neon user:", { id: neonUser.id, email: neonUser.email })
  console.log("[v0] Rendering SselfieApp")

  return <SselfieApp userId={neonUser.id} userName={neonUser.name} userEmail={neonUser.email} />
}
