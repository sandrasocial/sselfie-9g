import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LandingPage from "@/components/sselfie/landing-page"

export default async function Home() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect("/studio")
    }
  } catch (error) {
    // If auth check fails, just show the landing page
    console.log("[v0] Auth check failed, showing landing page:", error)
  }

  return <LandingPage />
}
