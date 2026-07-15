import { AdminNav } from "@/components/admin/admin-nav"
import { CampaignOutcomeQueue } from "@/components/admin/campaign-outcome-queue"

export const dynamic = "force-dynamic"

export default function CampaignsAdminPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <AdminNav />
      <CampaignOutcomeQueue />
    </main>
  )
}
