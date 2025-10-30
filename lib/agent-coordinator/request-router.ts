/**
 * Analyzes user requests and routes to the correct specialist agent
 */

export type AgentType = "content_researcher" | "brand_strategist" | "caption_writer" | "visual_stylist"

export type RoutingDecision = {
  agent: AgentType
  confidence: number
  reasoning: string
}

/**
 * Determines which specialist agent should handle the user's request
 */
export function routeRequest(userMessage: string): RoutingDecision {
  const message = userMessage.toLowerCase()

  // Caption-related requests
  if (
    message.includes("caption") ||
    message.includes("copy") ||
    message.includes("text") ||
    message.includes("write") ||
    message.includes("sound like me") ||
    message.includes("more casual") ||
    message.includes("more professional") ||
    message.includes("hook") ||
    message.includes("cta") ||
    message.includes("call to action")
  ) {
    return {
      agent: "caption_writer",
      confidence: 0.9,
      reasoning: "Request involves caption writing or copy editing",
    }
  }

  // Research-related requests
  if (
    message.includes("research") ||
    message.includes("trending") ||
    message.includes("hashtag") ||
    message.includes("competitor") ||
    message.includes("what's working") ||
    message.includes("best performing") ||
    message.includes("analyze")
  ) {
    return {
      agent: "content_researcher",
      confidence: 0.9,
      reasoning: "Request involves research or competitive analysis",
    }
  }

  // Strategy-related requests
  if (
    message.includes("strategy") ||
    message.includes("positioning") ||
    message.includes("stand out") ||
    message.includes("differentiate") ||
    message.includes("content pillar") ||
    message.includes("brand") ||
    message.includes("grow") ||
    message.includes("audience")
  ) {
    return {
      agent: "brand_strategist",
      confidence: 0.85,
      reasoning: "Request involves brand strategy or positioning",
    }
  }

  // Visual-related requests (default to Maya)
  if (
    message.includes("image") ||
    message.includes("photo") ||
    message.includes("visual") ||
    message.includes("style") ||
    message.includes("aesthetic") ||
    message.includes("color") ||
    message.includes("composition") ||
    message.includes("lighting") ||
    message.includes("moody") ||
    message.includes("bright") ||
    message.includes("grid")
  ) {
    return {
      agent: "visual_stylist",
      confidence: 0.9,
      reasoning: "Request involves visual design or styling",
    }
  }

  // Default to visual stylist (Maya's core expertise)
  return {
    agent: "visual_stylist",
    confidence: 0.5,
    reasoning: "Default routing to visual stylist",
  }
}

/**
 * Formats the specialist's response to sound like Maya
 */
export function formatAsMayaResponse(agent: AgentType, specialistResponse: string, userRequest: string): string {
  // Maya always responds, but acknowledges the work done
  const acknowledgments: Record<AgentType, string> = {
    caption_writer: "I've refined the caption for you",
    content_researcher: "I've researched that for you",
    brand_strategist: "I've thought through the strategy",
    visual_stylist: "I've updated the visual design",
  }

  // Return the specialist's response with Maya's voice
  return specialistResponse
}
