export interface LearningDestination {
  id: "skool" | "studio"
  label: string
  description: string
  href: string | null
  status: "available" | "coming-soon"
}

const studioComUrl = process.env.NEXT_PUBLIC_SSELFIE_STUDIO_COM_URL?.trim() || null

export const LEARNING_DESTINATIONS: readonly LearningDestination[] = [
  {
    id: "skool",
    label: "Skool community",
    description: "Lessons, practice, support and conversation with the SSELFIE community.",
    href: "https://www.skool.com/sselfie-photo-club-2569",
    status: "available",
  },
  {
    id: "studio",
    label: "Studio classes",
    description: "Structured SSELFIE classes and deeper guided learning on Studio.com.",
    href: studioComUrl,
    status: studioComUrl ? "available" : "coming-soon",
  },
] as const
