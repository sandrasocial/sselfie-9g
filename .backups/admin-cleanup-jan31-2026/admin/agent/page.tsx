import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Redirect /admin/agent to /admin/alex (Alex is the active email marketing assistant)
// NOTE: Authentication and admin email verification are handled by /admin/alex page
// This redirect is safe as the target page performs full auth checks before rendering
export default async function AdminAgentPage() {
  redirect("/admin/alex")
}
