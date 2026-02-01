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
    await sql`SELECT 1 FROM projects LIMIT 1`
    tablesExist = true
  } catch (error) {
    // Tables don't exist yet - show setup UI
  }

  if (!tablesExist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <AdminNav />
        <div className="p-8 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-3xl shadow-2xl p-12">
              <div className="text-6xl mb-6">🎨</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Your Project Tracker!
              </h1>
              <p className="text-gray-600 text-lg mb-8">
                Let's set up your beautiful ADHD-friendly task management system.
                This will create the database tables you need.
              </p>

              <form action="/api/admin/run-migration" method="POST">
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-xl font-semibold hover:scale-105 transition-transform shadow-lg"
                >
                  ✨ Set Up Project Tracker
                </button>
              </form>

              <p className="text-sm text-gray-500 mt-6">
                This will create your projects, tasks, and tracking tables.
                It's safe to run multiple times!
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
    FROM projects p
    LEFT JOIN project_tasks t ON t.project_id = p.id
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
    FROM project_tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE (
      t.scheduled_for = CURRENT_DATE
      OR t.id IN (SELECT task_id FROM daily_focus WHERE date = CURRENT_DATE)
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
    FROM project_tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    ORDER BY
      t.order_index ASC,
      t.created_at DESC
  `

  // Calculate stats
  const todayResult = await sql`
    SELECT COUNT(*) as count
    FROM project_tasks
    WHERE DATE(completed_at) = CURRENT_DATE
  `
  const weekResult = await sql`
    SELECT COUNT(*) as count
    FROM project_tasks
    WHERE completed_at >= DATE_TRUNC('week', CURRENT_DATE)
  `

  stats = {
    todayCompleted: parseInt(((todayResult as any[])[0] as any).count),
    weekCompleted: parseInt(((weekResult as any[])[0] as any).count),
    totalActive: (allTasks as any[]).filter((t: any) => t.status !== 'done').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <AdminNav />

      <div className="p-8">
        <ProjectTrackerClient
          initialProjects={projects as any}
          initialTodayTasks={todayTasks as any}
          initialAllTasks={allTasks as any}
          stats={stats}
        />
      </div>
    </div>
  )
}
