/**
 * Brand Engine Type Definitions
 * The "Celebrity Social Department" for SSELFIE Brand Engine
 */

// ============================================================================
// BRAND BRAIN TYPES (/brand_brain/) - Truth: identity, voice, offers, rules
// ============================================================================

export type BrandIdentity = {
  mission: string
  coreValues: string[]
  personalityTraits: string[]
  brandTruths: string[]
  boundaries: string[] // What the brand is NOT
}

export type TargetAudience = {
  demographics: {
    ageRange: string
    primaryGender: string
    locations: string[]
    lifeSituation: string[]
  }
  psychographics: {
    currentFeelings: string[]
    objections: string[]
    desiredTransformation: {
      from: string
      to: string
    }
  }
  howToSpeakToThem: string[]
}

export type Offer = {
  id: string
  name: string
  type: "productized_service" | "course" | "membership" | "one_time"
  forWho: string
  promise: string
  price: string
  cta: string
  isActive: boolean
}

export type VoiceStyle = {
  toneDescription: string
  voiceRules: {
    do: string[]
    dont: string[]
  }
  bannedWords: string[]
  exampleLines: string[]
}

export type BrandRules = {
  contentConsistencyRules: string[]
  voiceGuardrails: string[]
  messagingGuardrails: string[]
  qualityChecklist: string[]
}

export type CurrentFocus = {
  priorityGoal: string
  weeklyPriorities: Record<string, string>
  primaryOfferToPush: {
    offerId: string
    whyNow: string
  }
  timeBudget: string
  whatToIgnore: string[]
  successMetrics: string[]
}

export type ContentStrategy = {
  platforms: {
    platform: "instagram" | "tiktok" | "youtube" | "email" | "linkedin"
    cadence: string
    contentMix: string[]
  }[]
  contentPillars: {
    id: string
    name: string
    description: string
    postAngles: string[]
  }[]
  ctaMapping: {
    funnelStage: "top" | "mid" | "bottom"
    cta: string
    triggerWord: string
  }[]
  contentFormula: string
}

export type BrandBrain = {
  identity: BrandIdentity
  audience: TargetAudience
  offers: Offer[]
  voice: VoiceStyle
  rules: BrandRules
  currentFocus: CurrentFocus
  contentStrategy: ContentStrategy
  version: string
  lastUpdated: Date
}

// ============================================================================
// SIGNALS TYPES (/signals/) - External reality: trends, competitors, culture
// ============================================================================

export type TrendSignal = {
  id: string
  source: "tiktok" | "instagram" | "twitter" | "industry" | "news"
  type: "format" | "topic" | "audio" | "hashtag" | "visual_style"
  title: string
  description: string
  relevanceScore: number // 0-100
  velocity: "rising" | "peaking" | "declining"
  detectedAt: Date
  expiresAt?: Date
  examples: string[]
  suggestedAction?: string
}

export type CompetitorIntel = {
  id: string
  competitorName: string
  competitorHandle: string
  platform: "instagram" | "tiktok" | "youtube"
  observation: {
    type: "post" | "campaign" | "offer" | "messaging" | "format"
    description: string
    performance?: string
    isRepeating: boolean
  }
  detectedAt: Date
  takeaway: string
  shouldWe: "adopt" | "avoid" | "watch" | "differentiate"
}

export type CultureMoment = {
  id: string
  topic: string
  type: "news" | "cultural" | "holiday" | "industry" | "controversy"
  description: string
  relevanceToAudience: number // 0-100
  timing: "immediate" | "this_week" | "upcoming" | "ongoing"
  recommendation: "comment" | "avoid" | "observe" | "create_content"
  suggestedAngle?: string
  riskLevel: "low" | "medium" | "high"
  detectedAt: Date
}

export type SignalsData = {
  trends: TrendSignal[]
  competitors: CompetitorIntel[]
  cultureMoments: CultureMoment[]
  lastSyncedAt: Date
}

// ============================================================================
// PERFORMANCE TYPES (/performance/) - Internal reality: insights, tests, results
// ============================================================================

export type PostPerformance = {
  postId: string
  platform: "instagram" | "tiktok" | "youtube" | "email"
  postedAt: Date
  contentPillar: string
  contentType: string
  metrics: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
    saves?: number
    reach?: number
    engagementRate?: number
    clickThroughRate?: number
    conversions?: number
  }
  performance: "winner" | "average" | "loser"
  whyItWorked?: string
  whyItDidnt?: string
}

export type PerformanceInsight = {
  id: string
  type: "pattern" | "winner" | "loser" | "anomaly" | "recommendation"
  title: string
  description: string
  confidence: number // 0-100
  dataPoints: number
  timeframe: string
  suggestedAction?: string
  generatedAt: Date
}

export type Experiment = {
  id: string
  hypothesis: string
  variable: string
  control: string
  test: string
  metric: string
  targetLift: number
  status: "planned" | "running" | "completed" | "cancelled"
  startDate?: Date
  endDate?: Date
  results?: {
    winner: "control" | "test" | "inconclusive"
    lift: number
    confidence: number
    learnings: string
  }
}

export type PerformanceData = {
  posts: PostPerformance[]
  insights: PerformanceInsight[]
  experiments: Experiment[]
  weeklyDigest?: {
    topPosts: string[]
    bottomPosts: string[]
    keyLearnings: string[]
    nextWeekFocus: string[]
  }
  lastAnalyzedAt: Date
}

// ============================================================================
// AGENT TYPES - The "Celebrity Stack" agents
// ============================================================================

export type AgentId =
  | "brand_reasoner"
  | "competitor_intel"
  | "experiment_planner"
  | "voice_copy"
  | "creative_director"
  | "scheduler"
  // Future agents
  | "signal_scout"
  | "analytics_interpreter"
  | "culture_news"
  | "offer_monetization"
  | "editor_guardian"
  | "community_dm"
  | "crisis_pr"

export type AgentStatus = "idle" | "running" | "completed" | "error"

export type AgentOutput = {
  agentId: AgentId
  outputType: string
  content: any
  confidence: number
  reasoning?: string
  generatedAt: Date
  usedInputs: string[]
}

export type AgentRun = {
  id: string
  agentId: AgentId
  status: AgentStatus
  startedAt: Date
  completedAt?: Date
  inputs: Record<string, any>
  output?: AgentOutput
  error?: string
}

// ============================================================================
// BRAND REASONER OUTPUTS - The "Kim/Kylie social director"
// ============================================================================

export type WeeklyBrief = {
  id: string
  weekOf: Date
  whatMattersThisWeek: {
    priority: number
    topic: string
    reason: string
    suggestedAction: string
  }[]
  contentCalendar: {
    day: string
    platform: string
    contentType: string
    pillar: string
    angle: string
    cta: string
    priority: "must_post" | "if_time" | "optional"
  }[]
  experimentsToRun: string[]
  dontForget: string[]
  reasoning: string
  generatedAt: Date
}

export type TodaysPlan = {
  id: string
  date: Date
  whatToPostToday: {
    platform: string
    contentType: string
    angle: string
    hook: string
    cta: string
    timing: string
    whyThisToday: string
  }[]
  storiesToPost: {
    type: string
    content: string
    timing: string
  }[]
  engagementPriorities: string[]
  skipToday?: string
  reasoning: string
  generatedAt: Date
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export type EngineRunType = "daily" | "weekly" | "on_demand"

export type EngineRun = {
  id: string
  type: EngineRunType
  status: "scheduled" | "running" | "completed" | "failed"
  scheduledFor: Date
  startedAt?: Date
  completedAt?: Date
  agentRuns: AgentRun[]
  outputs: {
    weeklyBrief?: WeeklyBrief
    todaysPlan?: TodaysPlan
    draftContent?: any[]
  }
  approval: {
    status: "pending" | "approved" | "rejected" | "modified"
    reviewedBy?: string
    reviewedAt?: Date
    notes?: string
  }
}
