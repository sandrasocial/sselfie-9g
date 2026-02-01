import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/admin/populate-gumloop-tasks
 * Populate Gumloop Agent System tasks
 */
export async function POST(req: NextRequest) {
  try {
    const sql = getDb()

    // Get the Gumloop Agent System project
    const projects = await sql`
      SELECT id FROM tracker_projects
      WHERE title LIKE '%Gumloop%' OR title LIKE '%Agent%'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if ((projects as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: "Gumloop Agent System project not found. Create the project first using '+ New Project' button."
      }, { status: 404 })
    }

    const projectId = (projects as any)[0].id

    // Check if tasks already exist
    const existingTasks = await sql`
      SELECT COUNT(*) as count
      FROM tracker_tasks
      WHERE project_id = ${projectId}
    `

    if (parseInt(((existingTasks as any[])[0] as any).count) > 0) {
      return NextResponse.json({
        success: false,
        message: "Tasks already exist for this project",
        count: parseInt(((existingTasks as any[])[0] as any).count)
      })
    }

    // Define all tasks
    const tasks = [
      // PHASE 1: CORE AUTOMATION (This Week)
      {
        title: "Design Lead Nurture Agent flow in Gumloop",
        description: "Create flow: Application Analyzer → Personalization Engine → Email Writer. Set up trigger for new applications.",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 1
      },
      {
        title: "Test Lead Nurture Agent with sample data",
        description: "Run test applications through the flow. Verify personalization quality and email tone match your voice.",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 2
      },
      {
        title: "Connect Lead Nurture webhook to app",
        description: "Set up webhook endpoint in app to receive and send personalized follow-ups. Test integration end-to-end.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 3
      },

      // PHASE 2: CONTENT AUTOMATION
      {
        title: "Design Social Media Content Agent",
        description: "Create flow: Content Analyzer → Platform Strategist → Post Creator. Configure for Instagram, LinkedIn, Twitter.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 4
      },
      {
        title: "Test Social Media Agent with newsletter",
        description: "Feed in a recent newsletter. Verify it generates platform-specific posts with proper formatting and CTAs.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 5
      },

      // PHASE 3: CUSTOMER SUCCESS
      {
        title: "Build Onboarding Automation Agent",
        description: "Create flow: Purchase Detected → Onboarding Planner → Content Scheduler. Welcome sequences for new clients.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 6
      },
      {
        title: "Create Check-in Agent flow",
        description: "Design: Progress Tracker → Sentiment Analyzer → Outreach Creator. Proactive client engagement system.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 7
      },

      // PHASE 4: CONTENT ENGINE
      {
        title: "Design Content Repurposing Agent",
        description: "Create flow: Content Ingester → Format Adapter → Multi-Channel Publisher. Turn 1 piece into many formats.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 8
      },
      {
        title: "Build Analytics & Reporting Agent",
        description: "Create flow: Data Aggregator → Trend Analyzer → Report Generator. Weekly business insights automation.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 9
      },

      // INTEGRATION TASKS
      {
        title: "Document all agent webhook endpoints",
        description: "Create reference doc with all webhook URLs, authentication, and payload formats for each agent.",
        priority: "medium",
        is_quick_win: true,
        estimated_minutes: 15,
        order_index: 10
      },
      {
        title: "Set up agent monitoring dashboard",
        description: "Create simple dashboard to track: runs per day, success rate, errors. Monitor agent health.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 11
      }
    ]

    console.log(`Creating ${tasks.length} tasks for Gumloop Agent System...`)

    // Insert all tasks
    let insertedCount = 0
    for (const task of tasks) {
      await sql`
        INSERT INTO tracker_tasks (
          project_id,
          title,
          description,
          priority,
          is_quick_win,
          estimated_minutes,
          order_index
        )
        VALUES (
          ${projectId},
          ${task.title},
          ${task.description},
          ${task.priority},
          ${task.is_quick_win},
          ${task.estimated_minutes},
          ${task.order_index}
        )
      `
      insertedCount++
    }

    return NextResponse.json({
      success: true,
      message: `✅ Created ${insertedCount} tasks for Gumloop Agent System`,
      projectId,
      tasksCreated: insertedCount
    })

  } catch (error) {
    console.error("[Populate Gumloop Tasks] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
