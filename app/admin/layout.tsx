import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/404")
  }

  return <div className="relative min-h-screen">{children}</div>
}
