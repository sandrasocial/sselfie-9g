import { AdminNav } from "@/components/admin/admin-nav"
import { WorkWithMePipeline } from "@/components/admin/work-with-me-pipeline"

export const dynamic = "force-dynamic"

export default function WorkWithMeAdminPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <AdminNav />
      <WorkWithMePipeline />
    </main>
  )
}
