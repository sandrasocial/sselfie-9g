import type { FeedStrategy } from "@/lib/maya/feed-generation-handler"

export interface FeedPost {
  id: number
  position: number
  image_url: string | null
  generation_status: string
  prediction_id?: string | null
  prompt?: string
  content_pillar?: string
  post_type?: string
  caption?: string
}

export interface FeedPreviewCardProps {
  feedId?: number
  feedTitle?: string
  feedDescription?: string
  posts: FeedPost[]
  onViewFullFeed?: () => void
  needsRestore?: boolean
  strategy?: FeedStrategy
  isSaved?: boolean
  onSave?: (feedId: number) => void
  proMode?: boolean
  styleStrength?: number
  promptAccuracy?: number
  aspectRatio?: string
  realismStrength?: number
  messageId?: string
  onPromptUpdate?: (messageId: string, postId: number, newPrompt: string) => void
}
