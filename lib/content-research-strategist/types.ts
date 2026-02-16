export interface ContentResearchParams {
  niche: string
  brandProfile: {
    business_type: string
    target_audience: string
  }
}

export interface ResearchResult {
  trendingTopics: string[]
  audienceInsights: string
  competitorAnalysis: string
  trendingHashtags: string[]
  contentOpportunities: string[]
  researchSummary: string
}
