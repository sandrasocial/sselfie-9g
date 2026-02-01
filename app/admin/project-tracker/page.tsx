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

  // Fetch all active projects with progress
  const projects = await sql`
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
  const todayTasks = await sql`
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
  const allTasks = await sql`
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
  const stats = {
    todayCompleted: await sql`
      SELECT COUNT(*) as count
      FROM project_tasks
      WHERE DATE(completed_at) = CURRENT_DATE
    `.then(r => parseInt(r[0].count)),

    weekCompleted: await sql`
      SELECT COUNT(*) as count
      FROM project_tasks
      WHERE completed_at >= DATE_TRUNC('week', CURRENT_DATE)
    `.then(r => parseInt(r[0].count)),

    totalActive: allTasks.filter(t => t.status !== 'done').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <AdminNav />

      <div className="p-8">
        <ProjectTrackerClient
          initialProjects={projects}
          initialTodayTasks={todayTasks}
          initialAllTasks={allTasks}
          stats={stats}
        />
      </div>
    </div>
  )
}
