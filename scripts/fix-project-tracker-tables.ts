import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function fixTables() {
  console.log("🔧 Fixing Project Tracker tables (renaming to avoid conflicts)...\n")

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // Drop the incorrectly created tables if they exist
    console.log("Cleaning up conflicting tables...")
    
    await sql`DROP TABLE IF EXISTS daily_focus CASCADE`
    await sql`DROP TABLE IF EXISTS task_subtasks CASCADE`
    await sql`DROP TABLE IF EXISTS project_tasks CASCADE`
    await sql`DROP TABLE IF EXISTS achievements CASCADE`
    
    console.log("✅ Cleaned up\n")

    // Create tracker_projects table (renamed from projects)
    console.log("Creating tracker_projects table...")
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
    console.log("✅ tracker_projects table created")

    // Create tracker_tasks table
    console.log("Creating tracker_tasks table...")
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
    console.log("✅ tracker_tasks table created")

    // Create tracker_subtasks table
    console.log("Creating tracker_subtasks table...")
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
    console.log("✅ tracker_subtasks table created")

    // Create tracker_daily_focus table
    console.log("Creating tracker_daily_focus table...")
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
    console.log("✅ tracker_daily_focus table created")

    // Create tracker_achievements table
    console.log("Creating tracker_achievements table...")
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
    console.log("✅ tracker_achievements table created")

    // Create indexes
    console.log("Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_tasks_project ON tracker_tasks(project_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_tasks_status ON tracker_tasks(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_tasks_scheduled ON tracker_tasks(scheduled_for)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_subtasks_task ON tracker_subtasks(task_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tracker_daily_focus_date ON tracker_daily_focus(date)`
    console.log("✅ Indexes created")

    // Insert default project
    console.log("\nCreating default High-Ticket Offer project...")
    const adminUserId = 'ssa@ssasocial.com' // Sandra's user ID
    
    await sql`
      INSERT INTO tracker_projects (user_id, title, description, emoji, color, vision_image_url, goal_date)
      VALUES (
        ${adminUserId},
        'High-Ticket Offer Launch',
        'Create and launch premium service offering with landing page, booking system, and checkout flow',
        '💎',
        '#EC4899',
        '/images/img-4801.jpg',
        ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
      )
    `
    console.log("✅ Default project created")

    console.log("\n🎉 Project Tracker tables fixed successfully!")
    console.log("All tables renamed with 'tracker_' prefix to avoid conflicts\n")

  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

// Run migration
fixTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
