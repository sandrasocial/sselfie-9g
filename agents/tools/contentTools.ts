/**
 * Content Tools
 * Tools for content generation, research, and strategy
 * Used by: MarketingAutomationAgent
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const contentTools = {
  generateNewsletter: {
    description: "Generate a long-form weekly newsletter in Sandra's brand voice.",
    parameters: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string" as const,
          description: "The main topic or theme for the newsletter",
        },
        analyticsSummary: {
          type: "string" as const,
          description: "Optional analytics summary to include context in the newsletter",
        },
      },
      required: ["topic"],
    },
    execute: async (args: { topic: string; analyticsSummary?: string }) => {
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: `Write a newsletter in Sandra's voice. Topic: ${args.topic}. Analytics: ${args.analyticsSummary || "None provided"}. Include story, lesson, CTA.`,
        })
        return {
          success: true,
          content: text,
        }
      } catch (error) {
        console.error("[contentTools] generateNewsletter error:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    },
  },

  generateInstagramCaption: {
    description: "Create an Instagram caption based on a topic and optional angle.",
    parameters: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string" as const,
          description: "The main topic or theme for the Instagram post",
        },
        angle: {
          type: "string" as const,
          description: "Optional specific angle or perspective to take on the topic",
        },
      },
      required: ["topic"],
    },
    execute: async (args: { topic: string; angle?: string }) => {
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: `Write a high-converting IG caption for: ${args.topic}. Angle: ${args.angle || "General"}. Tone: Sandra: warm, direct, story-driven.`,
        })
        return {
          success: true,
          caption: text,
        }
      } catch (error) {
        console.error("[contentTools] generateInstagramCaption error:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    },
  },

  generateReelScript: {
    description: "Generate a short-form video script.",
    parameters: {
      type: "object" as const,
      properties: {
        concept: {
          type: "string" as const,
          description: "The concept or idea for the reel video",
        },
      },
      required: ["concept"],
    },
    execute: async (args: { concept: string }) => {
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: `Write a 20–40s reel script in Sandra's voice. Concept: ${args.concept}. Include hook, story, CTA.`,
        })
        return {
          success: true,
          script: text,
        }
      } catch (error) {
        console.error("[contentTools] generateReelScript error:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    },
  },

  generateEmailCopy: {
    description: "Generate marketing email copy.",
    parameters: {
      type: "object" as const,
      properties: {
        goal: {
          type: "string" as const,
          description: "The goal or objective of the email campaign",
        },
        offer: {
          type: "string" as const,
          description: "Optional offer or promotion to include in the email",
        },
        audienceSegment: {
          type: "string" as const,
          description: "Optional target audience segment (e.g., beta users, inactive users)",
        },
      },
      required: ["goal"],
    },
    execute: async (args: {
      goal: string
      offer?: string
      audienceSegment?: string
    }) => {
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: `Write an email for: ${args.goal}. Offer: ${args.offer || "None"}. Segment: ${args.audienceSegment || "General audience"}. Tone: emotional, story-based, hopeful.`,
        })
        return {
          success: true,
          emailCopy: text,
        }
      } catch (error) {
        console.error("[contentTools] generateEmailCopy error:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    },
  },
}
