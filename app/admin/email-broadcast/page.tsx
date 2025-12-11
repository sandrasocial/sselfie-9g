import { BetaTestimonialBroadcast } from '@/components/admin/beta-testimonial-broadcast'
import { EmailCampaignManager } from '@/components/admin/email-campaign-manager'

export default function BetaEmailBroadcastPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Email Campaigns</h1>
        <p className="text-stone-600">Manage all your email campaigns</p>
      </div>
      <EmailCampaignManager />
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Beta Testimonial Broadcast</h2>
        <BetaTestimonialBroadcast />
      </div>
    </div>
  )
}
