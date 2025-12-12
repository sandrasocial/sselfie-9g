import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getAuthenticatedUser()

  console.log("[v0] Admin layout - User:", user?.email)
  console.log("[v0] Admin layout - Expected admin:", ADMIN_EMAIL)
  console.log("[v0] Admin layout - Is admin:", user?.email === ADMIN_EMAIL)

  if (!user || user.email !== ADMIN_EMAIL) {
    console.log("[v0] Admin layout - Redirecting to 404, user is not admin")
    redirect("/404")
  }

  console.log("[v0] Admin layout - Access granted")
  return <div className="relative min-h-screen">{children}</div>
}
