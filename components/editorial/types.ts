export type EditorialFormat = "story" | "portrait"

export type EditorState = {
  image: string | null
  format: EditorialFormat
  headline: string
  subtext: string
  fontSize: number
  textY: number
  showOverlay: boolean
}

export const FORMATS: Record<EditorialFormat, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: "Story · 9:16" },
  portrait: { width: 1080, height: 1350, label: "Portrait · 4:5" },
}

export const DEFAULT_EDITOR_STATE: EditorState = {
  image: null,
  format: "story",
  headline: "",
  subtext: "",
  fontSize: 104,
  textY: 0,
  showOverlay: true,
}

export type EditorialPresetId = "hook" | "quote" | "offer"

export const EDITORIAL_PRESETS: Record<
  EditorialPresetId,
  { label: string; headline: string; subtext: string }
> = {
  hook: {
    label: "Hook",
    headline: "This changed\neverything",
    subtext: "Save this for later",
  },
  quote: {
    label: "Quote",
    headline: "“Your voice is\nthe strategy.”",
    subtext: "— Sandra",
  },
  offer: {
    label: "Offer",
    headline: "The guide is live",
    subtext: "Link in bio",
  },
}
