export type IgChannel = "dm" | "comment" | "story_reply" | "mention"
export type IgConversationStatus = "pending" | "auto_handled" | "flagged" | "sandra_replied" | "snoozed" | "closed"
export type IgMessageFromType = "contact" | "agent" | "sandra"
export type IgTriageAction = "auto_respond" | "flag" | "ignore"

export type IgContact = {
  igUserId: string
  username?: string | null
  fullName?: string | null
  profilePicUrl?: string | null
  isIcelandic?: boolean
  isVerifiedFriend?: boolean
  tags?: string[]
  notes?: string | null
}

export type IgTriageResult = {
  action: IgTriageAction
  reason: string
  flagReason?: string
  intent: string
  growthTags: string[]
  confidenceHint: number
}

export type IgResponderResult = {
  response: string
  confidence: number
  intent: string
  shouldSend: boolean
  growthTags: string[]
}

export type IgInboxConversation = {
  id: number
  igUserId: string
  igThreadId: string | null
  channel: IgChannel
  status: IgConversationStatus
  flagReason: string | null
  agentConfidence: number | null
  draftResponse: string | null
  lastMessageAt: string | null
  latestMessage: string | null
  latestFromType: IgMessageFromType | null
  contact: {
    username: string | null
    fullName: string | null
    profilePicUrl: string | null
    isIcelandic: boolean
    isVerifiedFriend: boolean
    tags: string[]
    notes: string | null
  }
}

