/**
 * BRAND ENGINE COORDINATOR
 *
 * The central orchestrator that:
 * - Runs scheduled workflows (daily, weekly)
 * - Coordinates agent communication
 * - Manages the data flow between agents
 * - Handles approval workflow
 *
 * This is the "control room" for the celebrity social stack.
 */

import {
  AgentId,
  AgentRun,
  EngineRun,
  BrandBrain,
  SignalsData,
  PerformanceData,
  WeeklyBrief,
  TodaysPlan,
} from "../types"
import { SSELFIE_BRAND_BRAIN } from "../brand-brain/sselfie-brand-brain"

// Agent imports
import { BRAND_REASONER_CONFIG } from "../agents/brand-reasoner"
import { COMPETITOR_INTEL_CONFIG } from "../agents/competitor-intel"
import { EXPERIMENT_PLANNER_CONFIG } from "../agents/experiment-planner"
import { VOICE_COPY_CONFIG } from "../agents/voice-copy"
import { CREATIVE_DIRECTOR_CONFIG } from "../agents/creative-director"
import { SCHEDULER_CONFIG } from "../agents/scheduler"

/**
 * All available agents and their configurations
 */
export const AGENT_REGISTRY = {
  brand_reasoner: BRAND_REASONER_CONFIG,
  competitor_intel: COMPETITOR_INTEL_CONFIG,
  experiment_planner: EXPERIMENT_PLANNER_CONFIG,
  voice_copy: VOICE_COPY_CONFIG,
  creative_director: CREATIVE_DIRECTOR_CONFIG,
  scheduler: SCHEDULER_CONFIG,
}

/**
 * Workflow definitions - which agents run when and in what order
 */
export const WORKFLOWS = {
  /**
   * WEEKLY ENGINE RUN
   * Runs every Sunday evening to plan the week ahead
   */
  weekly: {
    name: "Weekly Planning Engine",
    schedule: "Sunday 8:00 PM",
    steps: [
      {
        order: 1,
        agent: "competitor_intel" as AgentId,
        action: "generate_weekly_report",
        inputs: ["competitor_list"],
        outputs: ["competitor_intel_report"],
        canRunParallel: true,
      },
      {
        order: 1, // Same order = parallel
        agent: "experiment_planner" as AgentId,
        action: "review_experiments",
        inputs: ["recent_experiments", "performance_data"],
        outputs: ["experiment_results", "next_experiments"],
        canRunParallel: true,
      },
      {
        order: 2,
        agent: "brand_reasoner" as AgentId,
        action: "generate_weekly_brief",
        inputs: [
          "brand_brain",
          "competitor_intel_report",
          "experiment_results",
          "signals_data",
          "performance_data",
        ],
        outputs: ["weekly_brief"],
        canRunParallel: false,
      },
      {
        order: 3,
        agent: "creative_director" as AgentId,
        action: "generate_content_angles",
        inputs: ["weekly_brief", "content_pillars"],
        outputs: ["weekly_content_angles"],
        canRunParallel: false,
      },
      {
        order: 4,
        agent: "scheduler" as AgentId,
        action: "generate_weekly_calendar",
        inputs: ["weekly_brief", "weekly_content_angles", "existing_content"],
        outputs: ["weekly_calendar"],
        canRunParallel: false,
      },
    ],
    outputs: {
      primary: "weekly_brief",
      supporting: ["weekly_calendar", "weekly_content_angles", "next_experiments"],
    },
    approvalRequired: true,
    notifyOn: ["completion", "error"],
  },

  /**
   * DAILY ENGINE RUN
   * Runs every morning to provide today's focus
   */
  daily: {
    name: "Daily Planning Engine",
    schedule: "Daily 7:00 AM",
    steps: [
      {
        order: 1,
        agent: "brand_reasoner" as AgentId,
        action: "generate_todays_plan",
        inputs: [
          "brand_brain",
          "weekly_brief",
          "signals_data",
          "todays_date",
        ],
        outputs: ["todays_plan"],
        canRunParallel: false,
      },
      {
        order: 2,
        agent: "voice_copy" as AgentId,
        action: "generate_daily_drafts",
        inputs: ["todays_plan", "brand_brain"],
        outputs: ["caption_drafts", "story_ideas"],
        canRunParallel: false,
      },
    ],
    outputs: {
      primary: "todays_plan",
      supporting: ["caption_drafts", "story_ideas"],
    },
    approvalRequired: false, // Auto-deliver to inbox/dashboard
    notifyOn: ["completion"],
  },

  /**
   * ON-DEMAND CONTENT CREATION
   * Triggered when user needs specific content created
   */
  create_content: {
    name: "Content Creation Pipeline",
    schedule: "on_demand",
    steps: [
      {
        order: 1,
        agent: "creative_director" as AgentId,
        action: "develop_content_brief",
        inputs: ["content_request", "brand_brain"],
        outputs: ["creative_brief"],
        canRunParallel: false,
      },
      {
        order: 2,
        agent: "voice_copy" as AgentId,
        action: "write_content",
        inputs: ["creative_brief", "brand_brain"],
        outputs: ["content_draft"],
        canRunParallel: false,
      },
      {
        order: 3,
        agent: "scheduler" as AgentId,
        action: "generate_repurposing_plan",
        inputs: ["content_draft"],
        outputs: ["repurposing_plan"],
        canRunParallel: false,
      },
    ],
    outputs: {
      primary: "content_draft",
      supporting: ["creative_brief", "repurposing_plan"],
    },
    approvalRequired: true,
    notifyOn: ["completion"],
  },
}

/**
 * Engine state management
 */
export type EngineState = {
  lastWeeklyRun: Date | null
  lastDailyRun: Date | null
  currentWeeklyBrief: WeeklyBrief | null
  todaysPlan: TodaysPlan | null
  pendingApprovals: EngineRun[]
  activeRuns: EngineRun[]
  recentRuns: EngineRun[]
}

/**
 * Initialize engine state
 */
export function initializeEngineState(): EngineState {
  return {
    lastWeeklyRun: null,
    lastDailyRun: null,
    currentWeeklyBrief: null,
    todaysPlan: null,
    pendingApprovals: [],
    activeRuns: [],
    recentRuns: [],
  }
}

/**
 * Start a workflow run
 */
export async function startWorkflow(
  workflowId: keyof typeof WORKFLOWS,
  inputs: Record<string, any>
): Promise<EngineRun> {
  const workflow = WORKFLOWS[workflowId]

  const run: EngineRun = {
    id: `run-${Date.now()}`,
    type: workflowId === "weekly" ? "weekly" : workflowId === "daily" ? "daily" : "on_demand",
    status: "running",
    scheduledFor: new Date(),
    startedAt: new Date(),
    agentRuns: [],
    outputs: {},
    approval: {
      status: workflow.approvalRequired ? "pending" : "approved",
    },
  }

  // Execute workflow steps
  // In production, this would be handled by Make.com/n8n
  // This is the expected flow structure

  return run
}

/**
 * Handle approval/rejection of engine output
 */
export function handleApproval(
  runId: string,
  decision: "approved" | "rejected" | "modified",
  notes?: string
): void {
  // Update the run's approval status
  // In production, this would update the database and trigger next actions
}

/**
 * Get the data inputs for a workflow
 */
export function getWorkflowInputs(workflowId: keyof typeof WORKFLOWS): Record<string, any> {
  return {
    brand_brain: SSELFIE_BRAND_BRAIN,
    signals_data: getLatestSignals(),
    performance_data: getLatestPerformance(),
    competitor_list: getCompetitorList(),
    todays_date: new Date(),
    // Add other inputs as needed
  }
}

// Placeholder functions - these would fetch from database in production
function getLatestSignals(): SignalsData {
  return {
    trends: [],
    competitors: [],
    cultureMoments: [],
    lastSyncedAt: new Date(),
  }
}

function getLatestPerformance(): PerformanceData {
  return {
    posts: [],
    insights: [],
    experiments: [],
    lastAnalyzedAt: new Date(),
  }
}

function getCompetitorList() {
  return []
}

/**
 * Export the coordinator configuration for Make.com integration
 */
export const ENGINE_COORDINATOR_CONFIG = {
  name: "SSELFIE Brand Engine",
  version: "1.0.0",
  workflows: WORKFLOWS,
  agents: Object.keys(AGENT_REGISTRY),
  dataFolders: {
    brand_brain: "/brand_brain/",
    signals: "/signals/",
    performance: "/performance/",
  },
  schedules: {
    weekly: "0 20 * * 0", // Sunday 8pm (cron)
    daily: "0 7 * * *", // Daily 7am (cron)
  },
  notifications: {
    email: true,
    slack: false,
    inApp: true,
  },
}
