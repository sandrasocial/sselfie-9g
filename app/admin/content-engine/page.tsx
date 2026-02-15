import { AdminNav } from "@/components/admin/admin-nav"
import { ContentEnginePlanner } from "@/components/admin/content-engine-planner"

export const dynamic = "force-dynamic"

export default function AdminContentEnginePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-stone-100">
      <AdminNav />
      <ContentEnginePlanner />
    </div>
  )
}
