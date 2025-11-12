import { BusinessAdvisorChat } from "@/components/admin/business-advisor-chat"

export default function BusinessAdvisorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Business Advisor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your strategic partner for scaling SSELFIE Studio to $1M+ ARR
          </p>
        </div>
      </div>
      <BusinessAdvisorChat />
    </div>
  )
}
