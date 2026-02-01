import { getDb } from "@/lib/db"
import { ProjectTrackerClient } from "./project-tracker-client"
import { AdminNav } from "@/components/admin/admin-nav"

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Project Tracker
 * Beautiful, ADHD-friendly task management with vision board aesthetic
 */
export default async function ProjectTrackerPage() {
  try {
    const sql = getDb()

    // Check if tables exist, if not show setup page
    let tablesExist = false
    let projects: any = []
    let todayTasks: any = []
    let allTasks: any = []
    let stats = {
      todayCompleted: 0,
      weekCompleted: 0,
      totalActive: 0
    }

    try {
      await sql`SELECT 1 FROM tracker_projects LIMIT 1`
      tablesExist = true
    } catch (error) {
      // Tables don't exist yet - show setup UI
      tablesExist = false
    }

  if (!tablesExist) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-white border border-stone-200 p-12 max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">📋</div>
                <h1 className="text-2xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-3">
                  Project Tracker Setup
                </h1>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Your ADHD-friendly task management system is ready to be initialized.
                  This will create the necessary database tables.
                </p>
              </div>

              <form action="/api/admin/run-migration" method="POST" className="text-center">
                <button
                  type="submit"
                  className="px-6 py-3 bg-stone-950 text-stone-50 text-xs tracking-[0.15em] uppercase hover:bg-stone-800 transition-colors"
                >
                  Initialize Tables
                </button>
              </form>

              <p className="text-xs text-stone-500 text-center mt-6">
                Safe to run multiple times • No data will be lost
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fetch all active projects with progress
  projects = await sql`
    SELECT
      p.*,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') as tasks_remaining,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as tasks_completed,
      COUNT(DISTINCT t.id) as total_tasks
    FROM tracker_projects p
    LEFT JOIN tracker_tasks t ON t.project_id = p.id
    WHERE p.status != 'archived'
    GROUP BY p.id
    ORDER BY
      CASE p.status
        WHEN 'active' THEN 1
        WHEN 'paused' THEN 2
        WHEN 'completed' THEN 3
      END,
      p.created_at DESC
  `

  // Fetch today's focus tasks
  todayTasks = await sql`
    SELECT
      t.*,
      p.title as project_title,
      p.emoji as project_emoji,
      p.color as project_color
    FROM tracker_tasks t
    LEFT JOIN tracker_projects p ON p.id = t.project_id
    WHERE (
      t.scheduled_for = CURRENT_DATE
      OR t.id IN (SELECT task_id FROM tracker_daily_focus WHERE date = CURRENT_DATE)
    )
    AND t.status != 'done'
    ORDER BY
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
      END
    LIMIT 3
  `

  // Fetch all tasks for Kanban board
  allTasks = await sql`
    SELECT
      t.*,
      p.title as project_title,
      p.emoji as project_emoji,
      p.color as project_color
    FROM tracker_tasks t
    LEFT JOIN tracker_projects p ON p.id = t.project_id
    ORDER BY
      t.order_index ASC,
      t.created_at DESC
  `

  // Calculate stats
  const todayResult = await sql`
    SELECT COUNT(*) as count
    FROM tracker_tasks
    WHERE DATE(completed_at) = CURRENT_DATE
  `
  const weekResult = await sql`
    SELECT COUNT(*) as count
    FROM tracker_tasks
    WHERE completed_at >= DATE_TRUNC('week', CURRENT_DATE)
  `

  stats = {
    todayCompleted: parseInt(((todayResult as any[])[0] as any).count),
    weekCompleted: parseInt(((weekResult as any[])[0] as any).count),
    totalActive: (allTasks as any[]).filter((t: any) => t.status !== 'done').length
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <ProjectTrackerClient
          initialProjects={projects as any}
          initialTodayTasks={todayTasks as any}
          initialAllTasks={allTasks as any}
          stats={stats}
        />
      </div>
    </div>
  )
  } catch (error) {
    // Catch all errors and show friendly error page
    console.error("[Project Tracker] Error:", error)
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-white border border-stone-200 p-12 max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-2xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-3">
                  System Error
                </h1>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  The project tracker encountered an error. This might be a database connection issue.
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 mb-6">
                <p className="text-xs text-red-800 font-mono break-all">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
              <div className="text-center space-y-4">
                <a
                  href="/api/admin/run-migration"
                  className="inline-block px-6 py-3 bg-stone-950 text-stone-50 text-xs tracking-[0.15em] uppercase hover:bg-stone-800 transition-colors"
                >
                  Run Migration
                </a>
                <p className="text-xs text-stone-500">
                  Contact support if the issue persists
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
