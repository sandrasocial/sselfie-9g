import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/admin/run-migration
 * Run the project tracker database migration
 */
export async function POST(req: NextRequest) {
  try {
    const sql = getDb()

    // Run all the CREATE TABLE statements
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        emoji TEXT DEFAULT '🎯',
        color TEXT DEFAULT '#8B5CF6',
        status TEXT DEFAULT 'active',
        vision_image_url TEXT,
        goal_date TIMESTAMP,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'todo',
        is_quick_win BOOLEAN DEFAULT FALSE,
        is_deep_work BOOLEAN DEFAULT FALSE,
        energy_level TEXT DEFAULT 'medium',
        estimated_minutes INTEGER,
        actual_minutes INTEGER,
        due_date TIMESTAMP,
        scheduled_for DATE,
        completed_at TIMESTAMP,
        celebration_seen BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS task_subtasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS daily_focus (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        priority_rank INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date, priority_rank)
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        celebration_seen BOOLEAN DEFAULT FALSE
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON project_tasks(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON project_tasks(scheduled_for)`
    await sql`CREATE INDEX IF NOT EXISTS idx_subtasks_task ON task_subtasks(task_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_focus_date ON daily_focus(date)`

    // Insert default "High-Ticket Offer" project
    const existing = await sql`SELECT id FROM projects WHERE title = 'High-Ticket Offer Launch'`

    if (existing.length === 0) {
      await sql`
        INSERT INTO projects (title, description, emoji, color, vision_image_url, goal_date)
        VALUES (
          'High-Ticket Offer Launch',
          'Create and launch premium service offering with landing page, booking system, and checkout flow',
          '💎',
          '#EC4899',
          '/images/img-4801.jpg',
          ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        )
      `
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully"
    })
  } catch (error) {
    console.error("[Migration] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
