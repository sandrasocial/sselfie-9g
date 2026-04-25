import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getAuthenticatedUser()

  if (!user || !isAdminEmail(user.email)) {
    redirect("/404")
  }

  return <div className="relative min-h-screen">{children}</div>
}
