/**
 * Content Creation Workflow
 * Research → Strategy → Caption → Visual
 */

import type { WorkflowDefinition } from "../types"

export const contentCreationWorkflow: WorkflowDefinition = {
  id: "content-creation-v1",
  name: "Content Creation Workflow",
  description: "Full content creation pipeline from research to final post",
  steps: [
    {
      id: "research",
      agentRole: "content_researcher",
      description: "Research trending topics, hooks, and hashtags",
    },
    {
      id: "strategy",
      agentRole: "brand_strategist",
      description: "Define brand positioning and content strategy",
      inputMapping: (outputs) => ({
        researchData: outputs[0],
      }),
    },
    {
      id: "caption",
      agentRole: "caption_writer",
      description: "Write engaging Instagram caption",
      inputMapping: (outputs) => ({
        researchData: outputs[0],
        strategy: outputs[1],
      }),
    },
    {
      id: "visual",
      agentRole: "visual_stylist",
      description: "Design visual concept and styling",
      inputMapping: (outputs) => ({
        caption: outputs[2],
        strategy: outputs[1],
      }),
    },
  ],
}
