/**
 * Agent Tools Registry
 * Centralized registry of all available tools
 */

export { searchWebTool } from "./search-web"
export { analyzeRevenueTool } from "./analyze-revenue"
export { generateEmailTool } from "./generate-email"
export { researchCompetitorsTool } from "./research-competitors"
export { fetchUserContextTool } from "./fetch-user-context"

export const ALL_TOOLS = {
  searchWeb: "searchWebTool",
  analyzeRevenue: "analyzeRevenueTool",
  generateEmail: "generateEmailTool",
  researchCompetitors: "researchCompetitorsTool",
  fetchUserContext: "fetchUserContextTool",
} as const
