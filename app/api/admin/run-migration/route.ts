import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { redirect } from 'next/navigation'

/**
 * Run the project tracker database migration
 * Supports both GET and POST for easier access
 */
async function runMigration(req: NextRequest) {
  try {
    const sql = getDb()

    // Run all the CREATE TABLE statements with tracker_ prefix
    await sql`
      CREATE TABLE IF NOT EXISTS tracker_projects (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR,
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
      CREATE TABLE IF NOT EXISTS tracker_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES tracker_projects(id) ON DELETE CASCADE,
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
      CREATE TABLE IF NOT EXISTS tracker_subtasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tracker_tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS tracker_daily_focus (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        task_id INTEGER REFERENCES tracker_tasks(id) ON DELETE CASCADE,
        priority_rank INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date, priority_rank)
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS tracker_achievements (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        celebration_seen BOOLEAN DEFAULT FALSE
      )
    `

    // Create waitlist table (deprecated - using applications now)
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist_signups (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create Brand Engine applications table
    await sql`
      CREATE TABLE IF NOT EXISTS brand_engine_applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        website TEXT,
        revenue VARCHAR(50),
        current_spend VARCHAR(50),
        biggest_bottleneck TEXT,
        hours_per_week VARCHAR(50),
        business_description TEXT,
        why_interested TEXT,
        ready_to_invest VARCHAR(50),
        qualified BOOLEAN DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'pending',
        calendly_sent BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_tasks_project ON tracker_tasks(project_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_tasks_status ON tracker_tasks(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_tasks_scheduled ON tracker_tasks(scheduled_for)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_subtasks_task ON tracker_subtasks(task_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_daily_focus_date ON tracker_daily_focus(date)`

    // Insert default "High-Ticket Offer" project
    const existing = await sql`SELECT id FROM tracker_projects WHERE title = 'High-Ticket Offer Launch'`

    if ((existing as any[]).length === 0) {
      await sql`
        INSERT INTO tracker_projects (user_id, title, description, emoji, color, vision_image_url, goal_date)
        VALUES (
          'ssa@ssasocial.com',
          'High-Ticket Offer Launch',
          'Create and launch premium service offering with landing page, booking system, and checkout flow',
          '💎',
          '#EC4899',
          '/images/img-4801.jpg',
          ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
        )
      `
    }

    // Redirect back to project tracker
    return NextResponse.redirect(new URL('/admin/project-tracker', req.url))
  } catch (error) {
    console.error("[Migration] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Support both GET and POST
export async function GET(req: NextRequest) {
  return runMigration(req)
}

export async function POST(req: NextRequest) {
  return runMigration(req)
}
