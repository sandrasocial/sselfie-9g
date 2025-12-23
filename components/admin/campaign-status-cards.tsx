"use client"

import { CheckCircle, Eye, TrendingUp, Mail } from 'lucide-react'

interface Campaign {
  id: number
  name: string
  sentCount: number
  openedCount: number
  openRate: number
  date: string
  status: 'sent' | 'sending' | 'scheduled'
}

interface CampaignStatusCardsProps {
  campaigns: Campaign[]
  onViewDetails: (campaignId: number) => void
  onSendAgain: (campaignId: number) => void
}

export default function CampaignStatusCards({
  campaigns,
  onViewDetails,
  onSendAgain
}: CampaignStatusCardsProps) {
  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="bg-white border border-stone-300 rounded-lg p-4 hover:border-stone-400 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {campaign.status === 'sent' && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <h4 className="font-semibold text-stone-900">
                  {campaign.name}
                </h4>
              </div>
              <p className="text-xs text-stone-600">
                {campaign.date}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-xs text-stone-600">Sent</span>
              </div>
              <p className="text-base font-semibold text-stone-900">
                {campaign.sentCount.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-xs text-stone-600">Opened</span>
              </div>
              <p className="text-base font-semibold text-stone-900">
                {campaign.openedCount} ({campaign.openRate}%)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onViewDetails(campaign.id)}
              className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            >
              View Details
            </button>
            <button
              onClick={() => onSendAgain(campaign.id)}
              className="flex-1 px-3 py-2 text-xs bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              Send Again
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

