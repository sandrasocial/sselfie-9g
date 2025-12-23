"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import PromptBuilderChat from "./prompt-builder-chat"
import { WritingAssistant } from "./writing-assistant"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, Dumbbell, Plane, Coffee, Heart, Camera, LayoutGrid, List, Plus, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { Typography, Colors, Spacing, BorderRadius } from '@/lib/maya/pro/design-system'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Mode = "image-prompts" | "writing-assistant"

interface PromptGuide {
  id: number
  title: string
  category: string | null
  status: string
  total_prompts: number
  total_approved: number
  description: string | null
}

interface PromptGuideBuilderClientProps {
  userId: string
}

const CATEGORY_INFO = [
  {
    name: 'Chanel Luxury',
    icon: Sparkles,
    description: 'Iconic Parisian elegance with tweed, quilted bags, and timeless sophistication',
    color: 'from-stone-900 to-stone-700',
    imageUrl: '/categories/chanel-luxury.jpg',
    keywords: ['chanel', 'luxury', 'paris', 'tweed', 'elegant']
  },
  {
    name: 'ALO Workout',
    icon: Dumbbell,
    description: 'Athletic lifestyle with high-performance activewear and wellness aesthetics',
    color: 'from-blue-600 to-blue-400',
    imageUrl: '/categories/alo-workout.jpg',
    keywords: ['alo', 'workout', 'fitness', 'athletic', 'wellness']
  },
  {
    name: 'Travel',
    icon: Plane,
    description: 'Wanderlust adventures, exotic destinations, and lifestyle exploration',
    color: 'from-emerald-600 to-emerald-400',
    imageUrl: '/categories/travel.jpg',
    keywords: ['travel', 'adventure', 'vacation', 'destination']
  },
  {
    name: 'Lifestyle',
    icon: Coffee,
    description: 'Everyday moments, coffee runs, casual elegance, and authentic living',
    color: 'from-amber-600 to-amber-400',
    imageUrl: '/categories/lifestyle.jpg',
    keywords: ['lifestyle', 'casual', 'everyday', 'coffee']
  },
  {
    name: 'Wellness',
    icon: Heart,
    description: 'Self-care rituals, spa moments, mindfulness, and holistic beauty',
    color: 'from-pink-600 to-pink-400',
    imageUrl: '/categories/wellness.jpg',
    keywords: ['wellness', 'spa', 'self-care', 'beauty']
  },
  {
    name: 'Fashion',
    icon: Camera,
    description: 'Editorial styling, runway trends, and high-fashion statements',
    color: 'from-purple-600 to-purple-400',
    imageUrl: '/categories/fashion.jpg',
    keywords: ['fashion', 'editorial', 'style', 'runway']
  },
  {
    name: 'Seasonal Christmas',
    icon: Sparkles,
    description: 'Holiday elegance, festive moments, and winter luxury aesthetics',
    color: 'from-red-600 to-red-400',
    imageUrl: '/categories/christmas.jpg',
    keywords: ['christmas', 'holiday', 'winter', 'festive']
  },
]

export default function PromptGuideBuilderClient({ userId }: PromptGuideBuilderClientProps) {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>("image-prompts")
  const [guides, setGuides] = useState<PromptGuide[]>([])
  const [selectedGuideId, setSelectedGuideId] = useState<number | null>(null)
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string | null>(null)
  const [isLoadingGuides, setIsLoadingGuides] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createCategory, setCreateCategory] = useState("")
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [showQuickStart, setShowQuickStart] = useState(false)
  // Studio Pro Mode state (lifted from chat component for header display)
  const [studioProMode, setStudioProMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminPromptBuilderStudioProMode')
      return saved === 'true'
    }
    return false // Default to Classic Mode
  })
  const { toast } = useToast()

  // Persist Studio Pro mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminPromptBuilderStudioProMode', studioProMode.toString())
    }
  }, [studioProMode])

  // Handle mode switching
  const handleModeSwitch = (newMode: boolean) => {
    if (studioProMode === newMode) return
    setStudioProMode(newMode)
    toast({
      title: `Switched to ${newMode ? "Pro Mode" : "Classic Mode"}`,
      description: newMode 
        ? "Using Nano Banana Pro for generation" 
        : "Using Custom Flux for generation",
    })
  }

  // Load guides on mount
  useEffect(() => {
    loadGuides()
  }, [])

  // Auto-select guide from URL parameter
  useEffect(() => {
    const guideIdParam = searchParams.get('guideId')
    if (guideIdParam && guides.length > 0) {
      const guideId = Number.parseInt(guideIdParam, 10)
      if (!Number.isNaN(guideId)) {
        const guide = guides.find(g => g.id === guideId)
        if (guide && selectedGuideId !== guideId) {
          setSelectedGuideId(guide.id)
          setSelectedGuideCategory(guide.category)
          console.log("[PromptGuideBuilder] Auto-selected guide from URL:", guide.title)
        }
      }
    }
  }, [guides, searchParams, selectedGuideId])

  const loadGuides = async () => {
    try {
      setIsLoadingGuides(true)
      const response = await fetch("/api/admin/prompt-guides/list")
      if (response.ok) {
        const data = await response.json()
        setGuides(data.guides || [])
        console.log("[PromptGuideBuilder] Loaded guides:", data.guides?.length || 0)
      } else {
        console.error("[PromptGuideBuilder] Failed to load guides:", response.status)
        toast({
          title: "Failed to Load Guides",
          description: "Could not load prompt guides. Please refresh the page.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("[PromptGuideBuilder] Error loading guides:", error)
      toast({
        title: "Error Loading Guides",
        description: "Failed to load guides. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingGuides(false)
    }
  }

  const handleBrandQuickAccess = async (brandCategory: string) => {
    // Map simplified names to full category names
    const categoryMap: Record<string, string> = {
      'Chanel': 'Chanel Luxury',
      'ALO': 'ALO Workout',
      'Travel': 'Travel',
      'Wellness': 'Wellness',
      'Lifestyle': 'Lifestyle',
      'Fashion': 'Fashion'
    }
    
    const fullCategory = categoryMap[brandCategory] || brandCategory
    
    // Check if guide exists for this brand
    const existingGuide = guides.find(g => 
      g.category === fullCategory || 
      g.category?.toLowerCase().includes(brandCategory.toLowerCase()) ||
      g.title.toLowerCase().includes(brandCategory.toLowerCase())
    )
    
    if (existingGuide) {
      // Select existing guide
      setSelectedGuideId(existingGuide.id)
      setSelectedGuideCategory(existingGuide.category || fullCategory)
      
      toast({
        title: "Guide Selected",
        description: `Selected ${existingGuide.title}`,
      })
    } else {
      // Ask if user wants to create guide
      const confirmed = window.confirm(
        `No ${brandCategory} guide found. Create one now?`
      )
      
      if (confirmed) {
        // Auto-fill create modal
        setCreateTitle(`${fullCategory} Prompts`)
        setCreateDescription(`Professional ${fullCategory.toLowerCase()} prompt collection`)
        setCreateCategory(fullCategory)
        setShowCreateModal(true)
      }
    }
  }

  const handleGuideSelect = (value: string) => {
    if (value === "create-new") {
      setShowCreateModal(true)
      return
    }
    
    const guideId = Number.parseInt(value)
    const guide = guides.find(g => g.id === guideId)
    if (guide) {
      console.log("[PromptGuideBuilder] Guide selected:", guide.id, guide.title, guide.category)
      setSelectedGuideId(guide.id)
      setSelectedGuideCategory(guide.category)
      toast({
        title: "Guide Selected",
        description: `Selected "${guide.title}" - You can now create prompts for this guide`,
      })
    } else {
      console.warn("[PromptGuideBuilder] Guide not found for ID:", guideId)
      setSelectedGuideId(null)
      setSelectedGuideCategory(null)
    }
  }

  const handleCreateGuide = async () => {
    if (!createTitle || !createCategory) {
      toast({
        title: "Missing Fields",
        description: "Title and category are required",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/admin/prompt-guides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          description: createDescription,
          category: createCategory,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newGuide = data.guide
        
        // Reload guides and select the new one
        await loadGuides()
        setSelectedGuideId(newGuide.id)
        setSelectedGuideCategory(newGuide.category)
        setShowCreateModal(false)
        setCreateTitle("")
        setCreateDescription("")
        setCreateCategory("")
        
        toast({
          title: "Guide Created",
          description: `Created ${newGuide.title}`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create guide")
      }
    } catch (error: any) {
      console.error("[PromptGuideBuilder] Error creating guide:", error)
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create guide",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: Colors.background }}>
      {/* Editorial Header - Mobile First */}
      <div 
        className="sticky top-0 z-10 backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderBottom: `1px solid ${Colors.border}`
        }}
      >
        {/* Top Navigation Bar */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back Link */}
            <Link 
              href="/admin" 
              className="flex items-center gap-2 text-xs tracking-[0.15em] uppercase transition-colors"
              style={{ 
                color: Colors.textSecondary,
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                fontWeight: Typography.ui.weights.medium,
                letterSpacing: Typography.ui.letterSpacing
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            {/* Page Title - Editorial Style */}
            <h1 
              className="text-center tracking-[0.2em] uppercase"
              style={{
                fontFamily: Typography.headers.fontFamily,
                fontSize: '14px', // Compact for mobile
                fontWeight: Typography.headers.weights.regular,
                color: Colors.textPrimary,
                letterSpacing: '0.2em'
              }}
            >
              <span className="hidden sm:inline">Prompt Guide </span>Builder
            </h1>

            {/* Right Side: Guide Indicator, Mode Toggle, and Guide Selector */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Guide Indicator - Only show in Image Prompts mode */}
              {mode === "image-prompts" && (
                <>
                  {selectedGuideId ? (
                    <div 
                      className="px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs rounded shrink-0"
                      style={{
                        backgroundColor: Colors.backgroundAlt,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.buttonSm,
                        fontFamily: Typography.ui.fontFamily,
                        color: Colors.textSecondary,
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span className="hidden sm:inline">Guide: </span>
                      <span>{selectedGuideId}</span>
                    </div>
                  ) : (
                    <div 
                      className="px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs rounded shrink-0"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid rgba(239, 68, 68, 0.3)`,
                        borderRadius: BorderRadius.buttonSm,
                        fontFamily: Typography.ui.fontFamily,
                        color: '#dc2626',
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span className="hidden sm:inline">No Guide</span>
                      <span className="sm:hidden">No Guide</span>
                    </div>
                  )}

                  {/* Mode Switcher - Classic/Pro */}
                  <div 
                    className="flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1 py-0.5 sm:py-1 rounded shrink-0"
                    style={{
                      backgroundColor: Colors.backgroundAlt,
                      border: `1px solid ${Colors.border}`,
                      borderRadius: BorderRadius.buttonSm
                    }}
                  >
                    <button
                      onClick={() => handleModeSwitch(false)}
                      className="px-2.5 sm:px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition-all touch-manipulation"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.medium,
                        color: !studioProMode ? Colors.surface : Colors.textSecondary,
                        backgroundColor: !studioProMode ? Colors.primary : 'transparent',
                        borderRadius: BorderRadius.buttonSm,
                        minHeight: '36px',
                        minWidth: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Classic
                    </button>
                    <button
                      onClick={() => handleModeSwitch(true)}
                      className="px-2.5 sm:px-3 py-1.5 text-xs tracking-[0.1em] uppercase transition-all touch-manipulation"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.medium,
                        color: studioProMode ? Colors.surface : Colors.textSecondary,
                        backgroundColor: studioProMode ? Colors.primary : 'transparent',
                        borderRadius: BorderRadius.buttonSm,
                        minHeight: '36px',
                        minWidth: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Pro
                    </button>
                  </div>
                </>
              )}

              {/* Guide Selector - Minimal */}
              {mode === "image-prompts" && (
                <div className="w-[120px] sm:w-[180px]">
                  <Select 
                    value={selectedGuideId?.toString() || ""} 
                    onValueChange={handleGuideSelect}
                  >
                    <SelectTrigger 
                      className="h-9 text-xs border-0 shadow-none"
                      style={{
                        backgroundColor: Colors.backgroundAlt,
                        color: Colors.textSecondary,
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        borderRadius: BorderRadius.buttonSm
                      }}
                    >
                      <SelectValue placeholder="Select guide" />
                    </SelectTrigger>
                    <SelectContent>
                      {guides.map(guide => (
                        <SelectItem 
                          key={guide.id} 
                          value={guide.id.toString()}
                          style={{
                            fontFamily: Typography.ui.fontFamily,
                            fontSize: Typography.ui.sizes.sm
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate max-w-[140px]">{guide.title}</span>
                            <span 
                              className="text-xs"
                              style={{ 
                                color: Colors.textMuted,
                                fontFamily: Typography.data.fontFamily,
                                fontWeight: Typography.data.weights.medium
                              }}
                            >
                              {guide.total_approved}/{guide.total_prompts}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem 
                        value="create-new"
                        style={{ 
                          color: Colors.textPrimary,
                          fontFamily: Typography.ui.fontFamily,
                          fontWeight: Typography.ui.weights.medium
                        }}
                      >
                        Create New Guide
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {mode === "writing-assistant" && (
                <div className="w-[120px] sm:w-[180px]" />
              )}
            </div>
          </div>
        </div>

        {/* Mode Tabs - Editorial Style */}
        <div className="flex" style={{ borderTop: `1px solid ${Colors.borderLight}` }}>
          <button
            onClick={() => setMode("image-prompts")}
            className="flex-1 px-4 py-3 text-xs tracking-[0.15em] uppercase transition-all"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.xs,
              fontWeight: Typography.ui.weights.medium,
              backgroundColor: mode === "image-prompts" ? Colors.primary : 'transparent',
              color: mode === "image-prompts" ? '#FFFFFF' : Colors.textSecondary,
              borderBottom: mode === "image-prompts" ? 'none' : `1px solid ${Colors.borderLight}`
            }}
          >
            Image Prompts
          </button>
          <button
            onClick={() => setMode("writing-assistant")}
            className="flex-1 px-4 py-3 text-xs tracking-[0.15em] uppercase transition-all"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.xs,
              fontWeight: Typography.ui.weights.medium,
              backgroundColor: mode === "writing-assistant" ? Colors.primary : 'transparent',
              color: mode === "writing-assistant" ? '#FFFFFF' : Colors.textSecondary,
              borderBottom: mode === "writing-assistant" ? 'none' : `1px solid ${Colors.borderLight}`
            }}
          >
            Writing
          </button>
        </div>

        {/* Quick Start - Collapsible, Editorial */}
        {mode === "image-prompts" && (
          <div style={{ borderTop: `1px solid ${Colors.borderLight}` }}>
            <button
              onClick={() => setShowQuickStart(!showQuickStart)}
              className="w-full px-4 sm:px-6 py-3 flex items-center justify-between transition-colors hover:bg-stone-50/50"
            >
              <span 
                className="text-xs tracking-[0.1em] uppercase"
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.xs,
                  fontWeight: Typography.ui.weights.regular,
                  color: Colors.textSecondary
                }}
              >
                Quick Start by Brand
              </span>
              {showQuickStart ? (
                <ChevronUp className="w-3.5 h-3.5" style={{ color: Colors.textMuted }} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" style={{ color: Colors.textMuted }} />
              )}
            </button>
            
            {showQuickStart && (
              <div 
                className="px-4 sm:px-6 pb-4"
                style={{ 
                  backgroundColor: Colors.backgroundAlt,
                  borderTop: `1px solid ${Colors.borderLight}`
                }}
              >
                <div className="flex flex-wrap gap-2 pt-3">
                  {['Chanel', 'ALO', 'Travel', 'Wellness', 'Lifestyle', 'Fashion'].map((brand) => (
                    <button
                      key={brand}
                      onClick={() => handleBrandQuickAccess(brand)}
                      className="px-4 py-2 text-xs tracking-[0.1em] uppercase transition-all hover:bg-white"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.xs,
                        fontWeight: Typography.ui.weights.regular,
                        color: Colors.textSecondary,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.buttonSm,
                        backgroundColor: Colors.surface
                      }}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6" style={{ paddingTop: Spacing.section }}>
        {mode === "image-prompts" ? (
          <PromptBuilderChat
            userId={userId}
            selectedGuideId={selectedGuideId}
            selectedGuideCategory={selectedGuideCategory}
            studioProMode={studioProMode}
            onModeSwitch={handleModeSwitch}
            onGuideChange={(id, category) => {
              setSelectedGuideId(id)
              setSelectedGuideCategory(category)
            }}
          />
        ) : (
          <WritingAssistant />
        )}
      </div>

      {/* Create Guide Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-medium text-stone-950">Create New Guide</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase text-stone-600 mb-1">Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  placeholder="Guide title"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-stone-600 mb-1">Description</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm min-h-[80px]"
                  placeholder="Guide description"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-stone-600 mb-1">Category</label>
                <input
                  type="text"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                  placeholder="Category"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateTitle("")
                  setCreateDescription("")
                  setCreateCategory("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGuide}
                className="bg-stone-950 text-white hover:bg-stone-800"
              >
                Create Guide
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
