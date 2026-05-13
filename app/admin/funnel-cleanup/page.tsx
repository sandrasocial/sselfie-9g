import { redirect } from "next/navigation"

export default function FunnelCleanupAdminRedirectPage() {
  redirect("/admin/analytics")
}
