import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function runMigration() {
  console.log("🎨 Setting up Project Tracker tables...")

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // Create projects table
    console.log("Creating projects table...")
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
    console.log("✅ Projects table created")

    // Create project_tasks table
    console.log("Creating project_tasks table...")
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
    console.log("✅ Project tasks table created")

    // Create task_subtasks table
    console.log("Creating task_subtasks table...")
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
    console.log("✅ Task subtasks table created")

    // Create daily_focus table
    console.log("Creating daily_focus table...")
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
    console.log("✅ Daily focus table created")

    // Create achievements table
    console.log("Creating achievements table...")
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
    console.log("✅ Achievements table created")

    // Create indexes
    console.log("Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON project_tasks(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON project_tasks(scheduled_for)`
    await sql`CREATE INDEX IF NOT EXISTS idx_subtasks_task ON task_subtasks(task_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_focus_date ON daily_focus(date)`
    console.log("✅ Indexes created")

    // Insert default project
    console.log("Creating default High-Ticket Offer project...")
    try {
      const existing = await sql`
        SELECT COUNT(*) as count FROM projects
      `

      if ((existing as any)[0].count === 0) {
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
        console.log("✅ Default project created")
      } else {
        console.log("ℹ️  Projects already exist, skipping default project")
      }
    } catch (error) {
      console.log("⚠️  Could not create default project (table may already have data)")
    }

    console.log("\n🎉 Project Tracker migration completed successfully!")
    console.log("Visit http://localhost:3000/admin/project-tracker to see your beautiful task management system!\n")

  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
