export interface User {
  name: string
  avatar: string
  membershipTier: string
  followers: string
  following: string
  posts: string
}

export interface ConceptData {
  title: string
  description: string
  category: string // Changed from union type to string for flexibility
  prompt: string // Flux prompt for Replicate
  referenceImageUrl?: string // Added reference image URL for image-to-image generation
}

export interface Message {
  role: "maya" | "user"
  content: string
  timestamp: string
  concepts?: ConceptData[]
}

export interface GalleryImage {
  id: string // Combined ID like "ai_123" or "gen_456"
  url: string
  category: string
  favorited: boolean
  prompt?: string
  style?: string
  created_at?: string
  source?: "ai_images" | "generated_images"
}

export type TrainingStage = "upload" | "training" | "completed"
export type GalleryView = "instagram" | "all"
export type AcademyView = "overview" | "membership" | "courses"
