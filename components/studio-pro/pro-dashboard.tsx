"use client"

import { useState, useEffect } from "react"
import { Image, Video, Package, Edit, Shirt, X, Quote, Layers, RefreshCw } from "lucide-react"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  workflowType: string
  credits: number
}

interface ProDashboardProps {
  onActionClick: (workflowType: string) => void
}

export default function ProDashboard({ onActionClick }: ProDashboardProps) {
  const [avatarImages, setAvatarImages] = useState<any[]>([])
  const [brandKit, setBrandKit] = useState<any>(null)
  const [recentAssets, setRecentAssets] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load avatar images
      const avatarRes = await fetch('/api/studio-pro/avatar', { credentials: 'include' })
      if (avatarRes.ok) {
        const avatarData = await avatarRes.json()
        setAvatarImages(avatarData.images || [])
      }

      // Load brand kit
      const brandKitRes = await fetch('/api/studio-pro/brand-kits', { credentials: 'include' })
      if (brandKitRes.ok) {
        const brandKitData = await brandKitRes.json()
        const defaultKit = brandKitData.brandKits?.find((kit: any) => kit.is_default) || brandKitData.brandKits?.[0]
        setBrandKit(defaultKit)
      }

      // Load recent assets (from pro_generations)
      // TODO: Implement when generation API is ready
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: 'carousel',
      title: 'Create carousel',
      description: 'Multi-slide Instagram posts',
      icon: <Image className="w-6 h-6" />,
      workflowType: 'carousel',
      credits: 5,
    },
    {
      id: 'reel-cover',
      title: 'Create reel cover',
      description: 'Vertical reel thumbnails',
      icon: <Video className="w-6 h-6" />,
      workflowType: 'reel-cover',
      credits: 5,
    },
    {
      id: 'ugc-product',
      title: 'UGC product photo',
      description: 'User-generated content style',
      icon: <Package className="w-6 h-6" />,
      workflowType: 'ugc-product',
      credits: 5,
    },
    {
      id: 'edit-reuse',
      title: 'Edit / Reuse & Adapt',
      description: 'Edit images, remove objects, change outfits, or adapt for different formats',
      icon: <Edit className="w-6 h-6" />,
      workflowType: 'edit-image',
      credits: 3,
    },
    {
      id: 'quote-graphic',
      title: 'Quote graphic',
      description: 'Text-based graphics with branding',
      icon: <Quote className="w-6 h-6" />,
      workflowType: 'quote-graphic',
      credits: 3,
    },
    {
      id: 'product-mockup',
      title: 'Product mockup',
      description: 'Lifestyle product placement',
      icon: <Layers className="w-6 h-6" />,
      workflowType: 'product-mockup',
      credits: 5,
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-stone-200/60 p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-950">Studio Pro</h1>
            <p className="text-sm text-stone-600 mt-1">
              Build brand-ready assets with guided workflows
            </p>
          </div>

          {/* Avatar preview */}
          {avatarImages.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {avatarImages.slice(0, 3).map((img, index) => (
                  <img
                    key={index}
                    src={img.image_url}
                    alt={`Avatar ${index + 1}`}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                ))}
              </div>
              <span className="text-sm text-stone-600">
                {avatarImages.length} avatar{avatarImages.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Brand kit indicator */}
        {brandKit && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border border-stone-300"
                style={{ backgroundColor: brandKit.primary_color || '#000' }}
              />
              <div
                className="w-4 h-4 rounded-full border border-stone-300"
                style={{ backgroundColor: brandKit.secondary_color || '#666' }}
              />
              <div
                className="w-4 h-4 rounded-full border border-stone-300"
                style={{ backgroundColor: brandKit.accent_color || '#999' }}
              />
            </div>
            <span className="text-sm text-stone-600">
              {brandKit.name} {brandKit.brand_tone && `• ${brandKit.brand_tone}`}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-stone-950 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick(action.workflowType)}
              className="p-6 rounded-lg border-2 border-stone-200 bg-white hover:border-stone-900 hover:shadow-lg transition-all duration-200 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-950 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-stone-600 mb-2">
                    {action.description}
                  </p>
                  <span className="text-xs text-stone-500">
                    {action.credits} credits
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Assets - Gallery link */}
      <div className="border-t border-stone-200/60 p-4">
        <button
          onClick={() => {
            // Will be handled by parent to show gallery
            if (onActionClick) {
              onActionClick('gallery')
            }
          }}
          className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          View Gallery →
        </button>
      </div>
    </div>
  )
}


